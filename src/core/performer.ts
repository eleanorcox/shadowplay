// One performer: a hand, or two hands making a puppet together. It smooths each puppet's score over time and
// decides when a puppet has been held long enough to come alive, when it ends, and which hint to show for how long.
import type { PuppetId } from './puppets';
import { COUNTS, type Match } from './recognise';

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
export const NEAR = 0.4;

export interface PerformerView {
  /** The puppet being tried, if it is close enough to count as trying. */
  readonly nearest?: PuppetId;
  /** The smoothed score for the leading puppet, 0 to 1. */
  readonly score: number;
  readonly alive?: PuppetId;
  /** Seconds since it came alive. */
  readonly aliveFor: number;
  readonly hint?: string;
  /** What the live puppet is doing (opening its beak), 0 to 1. */
  readonly action: number;
}

export class Performer {
  private scores = new Map<PuppetId, number>();
  private hints = new Map<PuppetId, string | undefined>();
  private leader?: PuppetId;
  private leaderSince = 0;
  private countingSince?: number;
  alive?: PuppetId;
  private aliveSince = 0;
  private belowSince?: number;
  private hint?: { text: string; puppet: PuppetId; since: number };
  private action = 0;

  /** The best smoothed score. */
  get top(): number {
    return this.leader ? (this.scores.get(this.leader) ?? 0) : 0;
  }

  /** Takes this frame's matches; `dt` is seconds since the last frame. */
  feed(matches: readonly Match[], dt: number): void {
    const fresh = this.scores.size === 0;
    const follow = 1 - Math.exp(-dt / STAGE_TIMES.settle);
    for (const match of matches) {
      const id = match.puppet.id;
      const old = this.scores.get(id) ?? match.score;
      this.scores.set(id, fresh ? match.score : old + (match.score - old) * follow);
      this.hints.set(id, match.hint);
    }
    let top = -1;
    let leader: PuppetId | undefined;
    for (const [id, s] of this.scores) if (s > top) [leader, top] = [id, s];
    if (leader !== this.leader) {
      this.leader = leader;
      this.countingSince = undefined;
      this.leaderSince = Number.NaN;
    }
  }

  /** How much the live puppet is doing its thing this frame, smoothed. */
  act(raw: number, dt: number): void {
    this.action += (raw - this.action) * (1 - Math.exp(-dt / 0.06));
  }

  /** Decides what happens at `time`; adds a puppet to `made` when it comes alive. */
  decide(time: number, made: Set<PuppetId>): void {
    if (Number.isNaN(this.leaderSince)) this.leaderSince = time;
    const leader = this.leader;
    const top = this.top;
    if (this.alive) {
      if ((this.scores.get(this.alive) ?? 0) < KEEP) {
        this.belowSince ??= time;
        if (time - this.belowSince >= STAGE_TIMES.letGo) {
          this.alive = undefined;
          this.belowSince = undefined;
        }
      } else this.belowSince = undefined;
    } else if (leader && top >= COUNTS) {
      this.countingSince ??= time;
      if (time - this.countingSince >= STAGE_TIMES.hold - 1e-9) {
        this.alive = leader;
        this.aliveSince = time;
        this.action = 0;
        made.add(leader);
      }
    } else this.countingSince = undefined;

    // Hints: only while trying and not made; a hint stays up long enough to read unless the puppet changes.
    const wanted =
      !this.alive && leader && top >= NEAR && time - this.leaderSince >= STAGE_TIMES.hintAfter ? this.hints.get(leader) : undefined;
    const current = this.hint;
    const keep = current && !this.alive && current.puppet === leader && time - current.since < STAGE_TIMES.hintFor;
    if (keep) return;
    if (!wanted || !leader) this.hint = undefined;
    else if (current?.text !== wanted) this.hint = { text: wanted, puppet: leader, since: time };
  }

  /** Forgets what was happening, keeping the scores: used while the hands belong to someone else's puppet. */
  reset(time: number): void {
    this.alive = undefined;
    this.countingSince = undefined;
    this.belowSince = undefined;
    this.hint = undefined;
    this.leaderSince = time;
    this.action = 0;
  }

  view(time: number): PerformerView {
    return {
      nearest: this.leader && this.top >= NEAR ? this.leader : undefined,
      score: this.top,
      alive: this.alive,
      aliveFor: this.alive ? time - this.aliveSince : 0,
      hint: this.hint?.text,
      action: this.action,
    };
  }
}
