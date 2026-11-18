// The demonstration that plays on the wall when nobody is there: a model hand that opens, becomes each puppet
// in turn, makes it do its thing, and opens again. It is a function of time only, so it loops forever.
import { lerpPoint, type Landmark } from './hand';
import { modelHand, openHand, type Pose } from './handModel';
import { PUPPETS, puppet, type PuppetId } from './puppets';

interface Keyframe {
  /** The pose `t` seconds into this keyframe. */
  pose: (t: number) => Pose;
  hold: number;
}

/** Seconds to move from one keyframe to the next. */
const MOVE = 1.1;

const resting: Keyframe = { pose: () => ({ ...openHand(), x: 0.68, y: 0.72, turn: -0.1 }), hold: 0.8 };

/** Opens and shuts about twice a second, starting shut. */
const chatter = (t: number) => (t < 0.8 ? 0 : 0.5 - 0.5 * Math.cos((t - 0.8) * Math.PI * 2 * 1.6));

function puppetKeyframe(id: PuppetId): Keyframe {
  const p = puppet(id);
  if (!p.action) return { pose: (t) => ({ ...p.pose(0), turn: p.pose(0).turn + 0.06 * Math.sin(t * 2.2) }), hold: 3 };
  // Ends shut, so the move away starts from where the hand is.
  return { pose: (t) => p.pose(t > 3.1 ? 0 : chatter(t)), hold: 3.6 };
}

const KEYFRAMES: Keyframe[] = PUPPETS.flatMap((p) => [resting, puppetKeyframe(p.id)]);

/** One full loop, in seconds. */
export const DEMO_LENGTH = KEYFRAMES.reduce((sum, k) => sum + k.hold + MOVE, 0);

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The demonstration's hands at time `t` seconds. */
export function demoHands(t: number): Landmark[][] {
  let left = ((t % DEMO_LENGTH) + DEMO_LENGTH) % DEMO_LENGTH;
  for (let i = 0; i < KEYFRAMES.length; i++) {
    const key = KEYFRAMES[i]!;
    if (left < key.hold) return [modelHand(key.pose(left))];
    left -= key.hold;
    if (left < MOVE) {
      const next = KEYFRAMES[(i + 1) % KEYFRAMES.length]!;
      const from = modelHand(key.pose(key.hold));
      const to = modelHand(next.pose(0));
      const k = smooth(left / MOVE);
      return [from.map((p, j) => lerpPoint(p, to[j]!, k))];
    }
    left -= MOVE;
  }
  return [modelHand(KEYFRAMES[0]!.pose(0))];
}

/** A fixed scene for screenshots and trying things: one pose held still. */
export function stillHands(name: string): Landmark[][] | undefined {
  if (name === 'open') return [modelHand(resting.pose(0))];
  const p = PUPPETS.find((q) => q.id === name);
  return p ? [modelHand(p.pose(name === 'rabbit' ? 0 : 0.6))] : undefined;
}
