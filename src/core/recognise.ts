// Scores a described hand (or pair of hands) against each puppet, and picks the kindest useful hint: the check
// furthest off.
import type { Description, PairDescription } from './describe';
import { ONE_HANDED, TWO_HANDED, type Check, type OneHandedPuppet, type PairPuppet, type Puppet } from './puppets';

/** A puppet counts from this score, not 1, so a nearly-right puppet is a puppet. */
export const COUNTS = 0.8;

export interface Match {
  puppet: Puppet;
  score: number;
  /** What to change, when the puppet does not count yet. */
  hint?: string;
}

/** 1 inside the check's range, falling to 0 across its margin either side. */
export function checkScore(check: Check<never>, value: number): number {
  const [lo, hi] = check.range;
  const off = value < lo ? lo - value : value > hi ? value - hi : 0;
  return Math.max(0, 1 - off / check.margin);
}

function scoreChecks<D>(description: D, puppet: Puppet, checks: readonly Check<D>[]): Match {
  let total = 0;
  let weights = 0;
  let worst: { check: Check<D>; value: number; loss: number } | undefined;
  for (const check of checks) {
    const value = check.measure(description);
    const s = checkScore(check, value);
    const weight = check.weight ?? 1;
    total += s * weight;
    weights += weight;
    const loss = (1 - s) * weight;
    if (loss > 0 && (!worst || loss > worst.loss)) worst = { check, value, loss };
  }
  const result = total / weights;
  if (result >= COUNTS || !worst) return { puppet, score: result };
  const { hint } = worst.check;
  const text = typeof hint === 'string' ? hint : worst.value < worst.check.range[0] ? hint.low : hint.high;
  return { puppet, score: result, hint: text };
}

export function score(description: Description, puppet: OneHandedPuppet): Match {
  return scoreChecks(description, puppet, puppet.checks);
}

export function scorePair(description: PairDescription, puppet: PairPuppet): Match {
  return scoreChecks(description, puppet, puppet.checks);
}

/** Every one-handed puppet, best match first. */
export function recognise(description: Description, puppets: readonly OneHandedPuppet[] = ONE_HANDED): Match[] {
  return puppets.map((p) => score(description, p)).sort((a, b) => b.score - a.score);
}

/** Every two-handed puppet, best match first. */
export function recognisePair(description: PairDescription, puppets: readonly PairPuppet[] = TWO_HANDED): Match[] {
  return puppets.map((p) => scorePair(description, p)).sort((a, b) => b.score - a.score);
}
