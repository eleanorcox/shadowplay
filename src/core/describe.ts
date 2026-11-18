// Describes a hand pose in a way that is the same wherever the hand is, however big it is, and for a left or a
// right hand, so a puppet can be recognised for anyone. Lengths are in palm lengths; angles in radians.
import { angleBetween, dist, FINGER_JOINTS, FINGERS, sub, TIP, WRIST, type Landmark } from './hand';

export interface Description {
  /** For index, middle, ring and little: 0 straight to 1 folded, from the two joints above the knuckle. */
  bend: [number, number, number, number];
  /** From the thumb tip to each fingertip, index to little. */
  touch: [number, number, number, number];
  /** The angle between neighbouring fingers: index and middle, middle and ring, ring and little. */
  apart: [number, number, number];
  /** Which way the hand points in the picture, wrist to middle fingertip: 0 straight up, π/2 sideways, π down. */
  pointing: number;
  /**
   * How far the thumb tip sits above the line of the fingers, measured square to the fingers, on the side that
   * is higher in the picture. Negative is below. Meaningful when the hand points sideways.
   */
  thumbAbove: number;
  /** Ring tip to little tip: the dog's mouth. */
  mouth: number;
}

/** Straight is 0; fully folded at both upper joints is about this much. */
const FOLDED = 2.2;

export function describePose(points: readonly Landmark[]): Description {
  const at = (i: number) => points[i]!;
  const palm = dist(at(WRIST), at(FINGER_JOINTS.middle[0])) || 1;

  const bend = FINGERS.map((finger) => {
    const [k, m, u, t] = FINGER_JOINTS[finger].map(at) as [Landmark, Landmark, Landmark, Landmark];
    const total = angleBetween(sub(m, k), sub(u, m)) + angleBetween(sub(u, m), sub(t, u));
    return Math.min(1, total / FOLDED);
  }) as Description['bend'];

  const touch = FINGERS.map((finger) => dist(at(TIP.thumb), at(TIP[finger])) / palm) as Description['touch'];

  const direction = (finger: (typeof FINGERS)[number]) => {
    const [k, , , t] = FINGER_JOINTS[finger];
    return sub(at(t), at(k));
  };
  const apart = [0, 1, 2].map((i) => angleBetween(direction(FINGERS[i]!), direction(FINGERS[i + 1]!))) as Description['apart'];

  // The middle finger leans least in a relaxed hand, so it gives the fairest direction.
  const tips = at(TIP.middle);
  const dx = tips.x - at(WRIST).x;
  const dy = tips.y - at(WRIST).y;
  const length = Math.hypot(dx, dy) || 1;
  // Up the picture is negative y.
  const pointing = Math.acos(Math.min(1, Math.max(-1, -dy / length)));

  // Square to the fingers, choosing the side that is higher in the picture, so a left and a right hand agree.
  let [ux, uy] = [-dy / length, dx / length];
  if (uy > 0) [ux, uy] = [-ux, -uy];
  const base = at(FINGER_JOINTS.index[0]);
  const thumbAbove = ((at(TIP.thumb).x - base.x) * ux + (at(TIP.thumb).y - base.y) * uy) / palm;

  const mouth = dist(at(TIP.ring), at(TIP.little)) / palm;

  return { bend, touch, apart, pointing, thumbAbove, mouth };
}
