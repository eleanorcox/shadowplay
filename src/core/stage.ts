// The stage: follows hands from one camera frame to the next, pairs them up when two hands are making a puppet
// together, and keeps track of what has been made this visit and whether anybody is there at all. It is given
// hand points and times in seconds, and never looks at a clock or camera.
import { describePair, describePose } from './describe';
import { lerpPoint, WRIST, type Landmark } from './hand';
import { NEAR, Performer, STAGE_TIMES, type PerformerView } from './performer';
import { ONE_HANDED, PUPPETS, TWO_HANDED, type OneHandedPuppet, type PairPuppet, type PuppetId } from './puppets';
import { recognise, recognisePair } from './recognise';

export { STAGE_TIMES } from './performer';

/** Two sightings this far apart, in picture units, are different hands. */
const SAME_HAND = 0.3;
/**
 * A pair wins its hands even when one of them matches a one-handed puppet slightly better on its own: hooked
 * thumbs are deliberate, and a bird's hands are each a perfect dog.
 */
const PAIR_EDGE = 0.1;
/** How much of each new position is taken; lower is smoother but lags. */
const FOLLOW = 0.55;

export interface StageHand extends PerformerView {
  readonly id: number;
  /** Smoothed hand points, for drawing. */
  readonly points: readonly Landmark[];
  /** 1 while the hand is seen, fading to 0 as it is lost. */
  readonly presence: number;
  /** The other hand, when this hand is part of a two-handed puppet; its own puppet is then set aside. */
  readonly pairedWith?: number;
}

export interface StagePair extends PerformerView {
  /** The two hands, the one further left in the picture first. */
  readonly ids: readonly [number, number];
}

interface Tracked {
  id: number;
  points: Landmark[];
  /** The points as seen in the latest frame, unsmoothed, for recognising. */
  raw: readonly Landmark[];
  seenAt: number;
  performer: Performer;
  pairedWith?: number;
}

interface Pair {
  key: string;
  ids: [number, number];
  performer: Performer;
  claimed: boolean;
}

export class Stage {
  waiting = true;
  /** Puppets made this visit; cleared when everyone has gone. */
  readonly made = new Set<PuppetId>();
  private tracked: Tracked[] = [];
  private pairMap = new Map<string, Pair>();
  private nextId = 1;
  private time = 0;
  private emptySince?: number = 0;
  private one: readonly OneHandedPuppet[];
  private two: readonly PairPuppet[];

  constructor(puppets = PUPPETS) {
    this.one = ONE_HANDED.filter((p) => puppets.includes(p));
    this.two = TWO_HANDED.filter((p) => puppets.includes(p));
  }

  /** The puppet to suggest gently: the first not made yet this visit. */
  get suggestion(): PuppetId | undefined {
    return [...this.one, ...this.two].find((p) => !this.made.has(p.id))?.id;
  }

  get hands(): StageHand[] {
    return this.tracked.map((t) => ({
      ...t.performer.view(this.time),
      id: t.id,
      points: t.points,
      pairedWith: t.pairedWith,
      ...(t.pairedWith !== undefined ? { nearest: undefined } : {}),
      presence: Math.max(0, 1 - Math.max(0, this.time - t.seenAt - 0.1) / (STAGE_TIMES.lost - 0.1)),
    }));
  }

  /** Pairs of hands making, or trying to make, a two-handed puppet. */
  get pairs(): StagePair[] {
    const leftFirst = (ids: [number, number]): [number, number] => {
      const [a, b] = ids.map((id) => this.tracked.find((t) => t.id === id)!);
      return a!.points[WRIST]!.x <= b!.points[WRIST]!.x ? ids : [ids[1], ids[0]];
    };
    return [...this.pairMap.values()]
      .filter((p) => p.claimed)
      .map((p) => ({ ...p.performer.view(this.time), ids: leftFirst(p.ids) }));
  }

  /** Takes the hands seen in one camera frame, each as 21 points in picture units. */
  update(seen: readonly (readonly Landmark[])[], time: number): void {
    const dt = Math.min(0.25, Math.max(0, time - this.time));
    this.time = time;
    const unmatched = new Set(this.tracked);
    for (const points of seen) {
      if (points.length !== 21) continue;
      // The tracker lists hands in any order, so each sighting goes to the nearest hand already known.
      let match: Tracked | undefined;
      let best = SAME_HAND;
      for (const t of unmatched) {
        const d = Math.hypot(t.points[WRIST]!.x - points[WRIST]!.x, t.points[WRIST]!.y - points[WRIST]!.y);
        if (d < best) [match, best] = [t, d];
      }
      if (match) unmatched.delete(match);
      else {
        match = { id: this.nextId++, points: points.map((p) => ({ ...p })), raw: points, seenAt: time, performer: new Performer() };
        this.tracked.push(match);
      }
      match.points = match.points.map((p, i) => lerpPoint(p, points[i]!, FOLLOW));
      match.raw = points;
      match.seenAt = time;
      // Recognise from the raw points: smoothing them would blur a shape that is changing.
      const description = describePose(points);
      match.performer.feed(recognise(description, this.one), dt);
      const alive = this.one.find((p) => p.id === match.performer.alive);
      match.performer.act(alive?.action ? alive.action(description) : 0, dt);
    }
    this.tracked = this.tracked.filter((t) => time - t.seenAt < STAGE_TIMES.lost);
    this.updatePairs(time, dt);
    this.decide(time);

    if (this.tracked.length > 0) {
      this.emptySince = undefined;
      this.waiting = false;
    } else {
      this.emptySince ??= time;
      if (time - this.emptySince >= STAGE_TIMES.waitAfter && !this.waiting) {
        this.waiting = true;
        this.made.clear();
      }
    }
  }

  private updatePairs(time: number, dt: number): void {
    const ids = new Set(this.tracked.map((t) => t.id));
    for (const [key, pair] of this.pairMap) if (!ids.has(pair.ids[0]) || !ids.has(pair.ids[1])) this.pairMap.delete(key);
    if (this.two.length === 0) return;
    const seen = this.tracked.filter((t) => t.seenAt === time);
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        const [a, b] = [seen[i]!, seen[j]!];
        const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
        let pair = this.pairMap.get(key);
        if (!pair) {
          pair = { key, ids: [a.id, b.id], performer: new Performer(), claimed: false };
          this.pairMap.set(key, pair);
        }
        pair.performer.feed(recognisePair(describePair(a.raw, b.raw), this.two), dt);
      }
    }
  }

  /**
   * A pair claims its two hands while it is alive, or while it matches better than either hand does alone, so
   * a bird's hands are not also two dogs (see PAIR_EDGE). Each hand belongs to at most one pair; the best pairs choose first.
   */
  private decide(time: number): void {
    const byId = new Map(this.tracked.map((t) => [t.id, t]));
    const pairs = [...this.pairMap.values()].sort(
      (p, q) => Number(!!q.performer.alive) - Number(!!p.performer.alive) || q.performer.top - p.performer.top,
    );
    const taken = new Set<number>();
    for (const pair of pairs) {
      const [a, b] = pair.ids.map((id) => byId.get(id)!);
      const top = pair.performer.top;
      const wins = !!pair.performer.alive || (top >= NEAR && top + PAIR_EDGE >= Math.max(a!.performer.top, b!.performer.top));
      pair.claimed = wins && !taken.has(a!.id) && !taken.has(b!.id);
      if (!pair.claimed) {
        pair.performer.reset(time);
        continue;
      }
      taken.add(a!.id);
      taken.add(b!.id);
      // A pair with a hand out of sight keeps its state, so a dropout does not end it.
      if (a!.seenAt === time && b!.seenAt === time) pair.performer.decide(time, this.made);
    }
    for (const t of this.tracked) {
      const pair = pairs.find((p) => p.claimed && p.ids.includes(t.id));
      t.pairedWith = pair ? pair.ids.find((id) => id !== t.id) : undefined;
      if (pair) t.performer.reset(time);
      // A hand that is out of sight keeps its state until it is lost, so a dropout does not end anything.
      else if (t.seenAt === time) t.performer.decide(time, this.made);
    }
  }
}
