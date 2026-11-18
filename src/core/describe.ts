// Describes a hand pose in a way that is the same wherever the hand is, however big it is, and for a left or a
// right hand, so a puppet can be recognised for anyone. Lengths are in palm lengths; angles in radians.
import { angleBetween, dist, FINGER_JOINTS, FINGERS, sub, TIP, WRIST, type Landmark } from './hand';

export interface Description {
  /** For index, middle, ring and little: 0 straight to 1 folded, from the two joints above the knuckle. */
  bend: [number, number, number, number];
  /** Like `bend`, but counting the knuckle too: 0 for a finger straight out from the palm. */
  curl: [number, number, number, number];
  /** From the thumb tip to each fingertip, index to little. */
  touch: [number, number, number, number];
  /**
   * How far apart neighbouring fingers are spread, as angles across the palm: index and middle, middle and ring,
   * ring and little. Curling a finger does not change it.
   */
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

const cross = (a: Landmark, b: Landmark): Landmark => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** `v` with the part along `normal` taken away: its shadow on the plane `normal` stands up from. */
function flatten(v: Landmark, normal: Landmark): Landmark {
  const n2 = normal.x * normal.x + normal.y * normal.y + normal.z * normal.z || 1;
  const k = (v.x * normal.x + v.y * normal.y + v.z * normal.z) / n2;
  return { x: v.x - normal.x * k, y: v.y - normal.y * k, z: v.z - normal.z * k };
}

/** Straight is 0; fully folded at both upper joints is about this much. */
const FOLDED = 2.2;
/** Folded at the knuckle as well: a fist. */
const WHOLE_FIST = 3.4;

export function describePose(points: readonly Landmark[]): Description {
  const at = (i: number) => points[i]!;
  const palm = dist(at(WRIST), at(FINGER_JOINTS.middle[0])) || 1;

  const bend = FINGERS.map((finger) => {
    const [k, m, u, t] = FINGER_JOINTS[finger].map(at) as [Landmark, Landmark, Landmark, Landmark];
    const total = angleBetween(sub(m, k), sub(u, m)) + angleBetween(sub(u, m), sub(t, u));
    return Math.min(1, total / FOLDED);
  }) as Description['bend'];

  const curl = FINGERS.map((finger, i) => {
    const [k, m] = FINGER_JOINTS[finger].map(at) as [Landmark, Landmark];
    return Math.min(1, (angleBetween(sub(k, at(WRIST)), sub(m, k)) + bend[i]! * FOLDED) / WHOLE_FIST);
  }) as Description['curl'];

  const touch = FINGERS.map((finger) => dist(at(TIP.thumb), at(TIP[finger])) / palm) as Description['touch'];

  // Spread is sideways movement across the palm, so each finger's first bone is flattened onto the palm before
  // the angles are measured: a finger curling towards the palm then does not look spread.
  const normal = cross(sub(at(FINGER_JOINTS.index[0]), at(WRIST)), sub(at(FINGER_JOINTS.little[0]), at(WRIST)));
  const across = (finger: (typeof FINGERS)[number]) => {
    const [k, m] = FINGER_JOINTS[finger];
    return flatten(sub(at(m), at(k)), normal);
  };
  const apart = [0, 1, 2].map((i) => angleBetween(across(FINGERS[i]!), across(FINGERS[i + 1]!))) as Description['apart'];

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

  return { bend, curl, touch, apart, pointing, thumbAbove, mouth };
}

/** Two hands together, for two-handed puppets. The same whichever order the tracker lists them in. */
export interface PairDescription {
  /** Each hand on its own, the one further left in the picture first. */
  hands: [Description, Description];
  /** How close the thumbs are: from either thumb tip to the nearest part of the other thumb, in palm lengths. */
  thumbs: number;
  /** From one index fingertip to the other, in palm lengths: the top of a heart. */
  fingertips: number;
}

const THUMB_PARTS = [2, 3, 4];

export function describePair(a: readonly Landmark[], b: readonly Landmark[]): PairDescription {
  const [first, second] = a[WRIST]!.x <= b[WRIST]!.x ? [a, b] : [b, a];
  const palm = (dist(first[WRIST]!, first[FINGER_JOINTS.middle[0]]!) + dist(second[WRIST]!, second[FINGER_JOINTS.middle[0]]!)) / 2 || 1;
  const reach = (from: readonly Landmark[], to: readonly Landmark[]) =>
    Math.min(...THUMB_PARTS.map((i) => dist(from[TIP.thumb]!, to[i]!)));
  return {
    hands: [describePose(first), describePose(second)],
    thumbs: Math.min(reach(first, second), reach(second, first)) / palm,
    fingertips: dist(first[TIP.index]!, second[TIP.index]!) / palm,
  };
}
