// The demonstration that plays on the wall when nobody is there: a model hand that opens, becomes each puppet
// in turn (joined by a second hand for the two-handed ones), makes it do its thing, and opens again. It is a
// function of time only, so it loops forever.
import { lerpPoint, type Landmark } from './hand';
import { modelHand, openHand, type Pose } from './handModel';
import { PUPPETS, puppetHands, type Puppet } from './puppets';

interface Keyframe {
  /** The hands `t` seconds into this keyframe. */
  hands: (t: number) => Landmark[][];
  hold: number;
}

/** Seconds to move from one keyframe to the next. */
const MOVE = 1.1;

const restingPose = (): Pose => ({ ...openHand(), x: 0.68, y: 0.72, turn: -0.1 });
const resting: Keyframe = { hands: () => [modelHand(restingPose())], hold: 0.8 };

/** Moves back and forth about twice a second, starting still. */
const chatter = (t: number) => (t < 0.8 ? 0 : 0.5 - 0.5 * Math.cos((t - 0.8) * Math.PI * 2 * 1.6));

function puppetKeyframe(p: Puppet): Keyframe {
  const moves = p.hands === 2 || !!p.action || p.id === 'spider';
  if (!moves && p.hands === 1) {
    return { hands: (t) => [modelHand({ ...p.pose(0), turn: p.pose(0).turn + 0.06 * Math.sin(t * 2.2) })], hold: 3 };
  }
  // Ends still, so the move away starts from where the hands are.
  return { hands: (t) => puppetHands(p, t > 3.1 ? 0 : chatter(t)), hold: 3.6 };
}

const KEYFRAMES: Keyframe[] = PUPPETS.flatMap((p) => [resting, puppetKeyframe(p)]);

/** One full loop, in seconds. */
export const DEMO_LENGTH = KEYFRAMES.reduce((sum, k) => sum + k.hold + MOVE, 0);

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Moves between two sets of hands. A hand that arrives or leaves grows out of, or into, the first hand. */
function between(from: Landmark[][], to: Landmark[][], k: number): Landmark[][] {
  const count = Math.max(from.length, to.length);
  const hands: Landmark[][] = [];
  for (let i = 0; i < count; i++) {
    const a = from[i] ?? from[0]!;
    const b = to[i] ?? to[0]!;
    hands.push(a.map((p, j) => lerpPoint(p, b[j]!, k)));
  }
  // Once a leaving hand has merged into the first, it is gone.
  return k >= 1 ? hands.slice(0, to.length) : hands;
}

/** The demonstration's hands at time `t` seconds. */
export function demoHands(t: number): Landmark[][] {
  let left = ((t % DEMO_LENGTH) + DEMO_LENGTH) % DEMO_LENGTH;
  for (let i = 0; i < KEYFRAMES.length; i++) {
    const key = KEYFRAMES[i]!;
    if (left < key.hold) return key.hands(left);
    left -= key.hold;
    if (left < MOVE) {
      const next = KEYFRAMES[(i + 1) % KEYFRAMES.length]!;
      return between(key.hands(key.hold), next.hands(0), smooth(left / MOVE));
    }
    left -= MOVE;
  }
  return KEYFRAMES[0]!.hands(0);
}

/** A fixed scene for screenshots and trying things: one puppet held still, or `open` for an open hand. */
export function stillHands(name: string): Landmark[][] | undefined {
  if (name === 'open') return resting.hands(0);
  const p = PUPPETS.find((q) => q.id === name);
  return p ? puppetHands(p, name === 'rabbit' ? 0 : 0.6) : undefined;
}
