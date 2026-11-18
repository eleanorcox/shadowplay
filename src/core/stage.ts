// The stage: follows hands from one camera frame to the next and decides, over time, when a puppet has been held
// long enough to come alive, when to offer a hint and for how long, what has been made this visit, and whether
// anybody is there at all. It is given hand points and times in seconds, and never looks at a clock or camera.
import { describePose } from './describe';
import { lerpPoint, WRIST, type Landmark } from './hand';
import { PUPPETS, type Puppet, type PuppetId } from './puppets';
import { COUNTS, recognise } from './recognise';

/** How long things take, in seconds. */
export const STAGE_TIMES = {
  /** A puppet has to count for this long before it comes alive, so passing shapes do not set it off. */
  hold: 0.6,
  /** A live puppet that stops counting lasts this long before it ends, so a wobble does not end it. */
  letGo: 0.5,
  /** A hand not seen for this long is gone. */
  lost: 0.6,
  /** A hint appears once a puppet has been tried for this long without counting. */
  hintAfter: 1.2,
  /** A hint stays at least this long, to be read and acted on. */
  hintFor: 3,
  /** Nobody in view for this long: back to the demonstration, and the stars are cleared. */
  waitAfter: 10,
  /** How quickly scores follow the hand; longer is steadier and slower. */
  settle: 0.12,
};

/** Below this, a live puppet starts to let go; lower than COUNTS so it does not flicker at the edge. */
const KEEP = 0.7;
/** A puppet scoring this much is being tried, and earns a hint. */
const NEAR = 0.4;
/** Two sightings this far apart, in picture units, are different hands. */
const SAME_HAND = 0.3;
/** How much of each new position is taken; lower is smoother but lags. */
const FOLLOW = 0.55;

export interface StageHand {
  readonly id: number;
  /** Smoothed hand points, for drawing. */
  readonly points: readonly Landmark[];
  /** The puppet this hand is nearest to, if it is close enough to be trying. */
  readonly nearest?: PuppetId;
  /** The smoothed score for the nearest puppet, 0 to 1. */
  readonly score: number;
  readonly alive?: PuppetId;
  /** Seconds since it came alive. */
  readonly aliveFor: number;
  readonly hint?: string;
  /** What the live puppet is doing (opening its beak), 0 to 1. */
  readonly action: number;
  /** 1 while the hand is seen, fading to 0 as it is lost. */
  readonly presence: number;
}

interface Tracked {
  id: number;
  points: Landmark[];
  scores: Map<PuppetId, number>;
  hints: Map<PuppetId, string | undefined>;
  seenAt: number;
  leader?: PuppetId;
  leaderSince: number;
  countingSince?: number;
  alive?: PuppetId;
  aliveSince: number;
  belowSince?: number;
  hint?: { text: string; puppet: PuppetId; since: number };
  action: number;
  rawAction: number;
}

export class Stage {
  waiting = true;
  /** Puppets made this visit; cleared when everyone has gone. */
  readonly made = new Set<PuppetId>();
  private tracked: Tracked[] = [];
  private nextId = 1;
  private time = 0;
  private emptySince?: number = 0;

  constructor(private puppets: readonly Puppet[] = PUPPETS) {}

  /** The puppet to suggest gently: the first not made yet this visit. */
  get suggestion(): PuppetId | undefined {
    return this.puppets.find((p) => !this.made.has(p.id))?.id;
  }

  get hands(): StageHand[] {
    return this.tracked.map((t) => {
      const nearest = t.leader && (t.scores.get(t.leader) ?? 0) >= NEAR ? t.leader : undefined;
      return {
        id: t.id,
        points: t.points,
        nearest,
        score: t.leader ? (t.scores.get(t.leader) ?? 0) : 0,
        alive: t.alive,
        aliveFor: t.alive ? this.time - t.aliveSince : 0,
        hint: t.hint?.text,
        action: t.action,
        presence: Math.max(0, 1 - Math.max(0, this.time - t.seenAt - 0.1) / (STAGE_TIMES.lost - 0.1)),
      };
    });
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
        match = this.newHand(points, time);
        this.tracked.push(match);
      }
      this.see(match, points, time, dt);
    }
    for (const t of this.tracked) this.decide(t, time);
    this.tracked = this.tracked.filter((t) => time - t.seenAt < STAGE_TIMES.lost);

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

  private newHand(points: readonly Landmark[], time: number): Tracked {
    return {
      id: this.nextId++,
      points: points.map((p) => ({ ...p })),
      scores: new Map(),
      hints: new Map(),
      seenAt: time,
      leaderSince: time,
      aliveSince: time,
      action: 0,
      rawAction: 0,
    };
  }

  private see(t: Tracked, points: readonly Landmark[], time: number, dt: number): void {
    const fresh = t.scores.size === 0;
    t.points = t.points.map((p, i) => lerpPoint(p, points[i]!, FOLLOW));
    t.seenAt = time;
    // Recognise from the raw points: smoothing them would blur a shape that is changing.
    const description = describePose(points);
    const follow = 1 - Math.exp(-dt / STAGE_TIMES.settle);
    for (const match of recognise(description, this.puppets)) {
      const id = match.puppet.id;
      const old = t.scores.get(id) ?? match.score;
      t.scores.set(id, fresh ? match.score : old + (match.score - old) * follow);
      t.hints.set(id, match.hint);
    }
    const alive = t.alive && this.puppets.find((p) => p.id === t.alive);
    t.rawAction = alive && alive.action ? alive.action(description) : 0;
    t.action += (t.rawAction - t.action) * (1 - Math.exp(-dt / 0.06));
  }

  private decide(t: Tracked, time: number): void {
    // A hand that is out of sight keeps its state until it is lost, so a dropout does not end anything.
    if (t.seenAt !== time) return;
    let leader: PuppetId | undefined;
    let top = -1;
    for (const [id, s] of t.scores) if (s > top) [leader, top] = [id, s];
    if (leader !== t.leader) {
      t.leader = leader;
      t.leaderSince = time;
      t.countingSince = undefined;
    }

    if (t.alive) {
      if ((t.scores.get(t.alive) ?? 0) < KEEP) {
        t.belowSince ??= time;
        if (time - t.belowSince >= STAGE_TIMES.letGo) {
          t.alive = undefined;
          t.belowSince = undefined;
        }
      } else t.belowSince = undefined;
    } else if (leader && top >= COUNTS) {
      t.countingSince ??= time;
      if (time - t.countingSince >= STAGE_TIMES.hold - 1e-9) {
        t.alive = leader;
        t.aliveSince = time;
        t.action = 0;
        this.made.add(leader);
      }
    } else t.countingSince = undefined;

    // Hints: only while trying and not made; a hint stays up long enough to read unless the puppet changes.
    const wanted =
      !t.alive && leader && top >= NEAR && time - t.leaderSince >= STAGE_TIMES.hintAfter ? t.hints.get(leader) : undefined;
    const current = t.hint;
    const keep = current && !t.alive && current.puppet === leader && time - current.since < STAGE_TIMES.hintFor;
    if (keep) return;
    if (!wanted || !leader) t.hint = undefined;
    else if (current?.text !== wanted) t.hint = { text: wanted, puppet: leader, since: time };
  }
}
