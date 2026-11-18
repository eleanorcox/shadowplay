// The 21 points MediaPipe finds on a hand, and small geometry helpers for them.
// Points are in picture units: 0 to 1 down the picture and the same scale across, as the camera sees them
// (not mirrored). z is depth, smaller is nearer the camera, on roughly the same scale.

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export const POINTS = 21;
export const WRIST = 0;

export type Finger = 'index' | 'middle' | 'ring' | 'little';
export const FINGERS: readonly Finger[] = ['index', 'middle', 'ring', 'little'];

/** Each finger's four points, from knuckle to tip; the thumb's from its base to tip. */
export const FINGER_JOINTS: Record<Finger, readonly [number, number, number, number]> = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  little: [17, 18, 19, 20],
};
export const THUMB_JOINTS = [1, 2, 3, 4] as const;

export const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, little: 20 } as const;

/** Which points join up into the bones of a hand. */
export const BONES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export const sub = (a: Landmark, b: Landmark): Landmark => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const lerpPoint = (a: Landmark, b: Landmark, t: number): Landmark => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

/** The angle between two directions, 0 to π. */
export function angleBetween(a: Landmark, b: Landmark): number {
  const la = Math.hypot(a.x, a.y, a.z);
  const lb = Math.hypot(b.x, b.y, b.z);
  if (la === 0 || lb === 0) return 0;
  const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
  return Math.acos(Math.min(1, Math.max(-1, cos)));
}

/** A point made from several hand points, weighted, for anchoring things like a puppet's eye. */
export function mix(points: readonly Landmark[], weights: readonly (readonly [number, number])[]): Landmark {
  let x = 0, y = 0, z = 0, total = 0;
  for (const [index, weight] of weights) {
    const p = points[index]!;
    x += p.x * weight;
    y += p.y * weight;
    z += p.z * weight;
    total += weight;
  }
  return { x: x / total, y: y / total, z: z / total };
}
