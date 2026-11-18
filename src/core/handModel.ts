// The model hand: a few numbers about how a hand is held become the same 21 points MediaPipe gives.
// It poses the puppet cards, plays the demonstration, and makes test examples before there are recordings.
// It is a simple stick hand with made-up proportions, not anatomy; real hands are checked with recordings.
import { FINGER_JOINTS, FINGERS, POINTS, type Finger, type Landmark } from './hand';

/** One finger: bend at the knuckle, bend at each of the two upper joints, and an extra lean sideways, in radians. */
export interface FingerPose {
  knuckle: number;
  curl: number;
  /** Leans the finger towards the thumb side; negative leans it away. */
  lean?: number;
}

/**
 * The thumb either points somewhere, or reaches to touch one of the other 20 points.
 * `out` swings it away from the fingers in the palm's plane; `forward` brings it in front of the palm.
 */
export type ThumbPose = { out: number; forward?: number; bend?: number } | { touch: number; gap?: number };

export interface Pose {
  fingers: Record<Finger, FingerPose>;
  thumb: ThumbPose;
  /** 0 holds the fingers parallel, 1 is a relaxed hand, above that spreads them. */
  fan: number;
  hand: 'left' | 'right';
  /** Where the wrist is, in picture units, and the palm's length from wrist to middle knuckle. */
  x: number;
  y: number;
  size: number;
  /** Turns the hand in the picture: 0 has the fingers pointing up, π/2 points them to the picture's right. */
  turn: number;
  /** Turns the hand about its own length: 0 shows the palm to the camera, π/2 shows its edge. */
  side: number;
}

// Built for a right hand with its palm to the camera, in a frame where X is towards the thumb, Y is up the
// fingers and Z is out of the palm towards the camera. A palm is 1 long.
const KNUCKLES: Record<Finger, [number, number]> = {
  index: [0.3, 0.93],
  middle: [0.07, 1],
  ring: [-0.15, 0.95],
  little: [-0.34, 0.83],
};
const SEGMENTS: Record<Finger, [number, number, number]> = {
  index: [0.42, 0.25, 0.2],
  middle: [0.47, 0.29, 0.22],
  ring: [0.44, 0.27, 0.21],
  little: [0.34, 0.2, 0.18],
};
/** How far each finger leans towards the thumb side in a relaxed hand. */
const NATURAL_FAN: Record<Finger, number> = { index: 0.13, middle: 0.02, ring: -0.09, little: -0.2 };
const THUMB_BASE: V = [0.22, 0.2, 0.05];
const THUMB_SEGMENTS = [0.36, 0.3, 0.25];

type V = [number, number, number];

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V): V => scale(a, 1 / (Math.hypot(...a) || 1));

/** Rotates `v` about the unit axis `k` by `angle`, the right-hand way. */
function rotate(v: V, k: V, angle: number): V {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, d * (1 - c)));
}

/** A finger leaning sideways by `lean` in the palm's plane, bending towards the palm side. */
function chain(start: V, lean: number, bends: number[], lengths: number[]): V[] {
  const straight: V = [Math.sin(lean), Math.cos(lean), 0];
  const axis = norm(cross(straight, [0, 0, 1]));
  const points: V[] = [start];
  let at = start;
  let bent = 0;
  for (let i = 0; i < lengths.length; i++) {
    bent += bends[i]!;
    at = add(at, scale(rotate(straight, axis, bent), lengths[i]!));
    points.push(at);
  }
  return points;
}

export function modelHand(pose: Pose): Landmark[] {
  const local: V[] = new Array(POINTS);
  local[0] = [0, 0, 0];
  for (const finger of FINGERS) {
    const { knuckle, curl, lean = 0 } = pose.fingers[finger];
    const [kx, ky] = KNUCKLES[finger];
    const joints = chain([kx, ky, 0], NATURAL_FAN[finger] * pose.fan + lean, [knuckle, curl, curl * 0.8], SEGMENTS[finger]);
    FINGER_JOINTS[finger].forEach((index, i) => (local[index] = joints[i]!));
  }
  const thumb = pose.thumb;
  if ('touch' in thumb) {
    // Reach for the point, slightly in front of it so the thumb rests against it rather than inside it.
    const target = add(local[thumb.touch]!, [0, 0, 0.08 + (thumb.gap ?? 0)]);
    const across: V = [target[0] - THUMB_BASE[0], target[1] - THUMB_BASE[1], target[2] - THUMB_BASE[2]];
    // The two middle joints bow outwards and forwards, as a thumb does when it reaches across.
    const bow: V = [0.12, -0.04, 0.12];
    local[1] = THUMB_BASE;
    local[2] = add(add(THUMB_BASE, scale(across, 0.42)), bow);
    local[3] = add(add(THUMB_BASE, scale(across, 0.74)), scale(bow, 0.6));
    local[4] = target;
  } else {
    let direction: V = [Math.sin(thumb.out), Math.cos(thumb.out), 0];
    direction = rotate(direction, norm(cross(direction, [0, 0, 1])), thumb.forward ?? 0);
    const axis = norm(cross(direction, [-1, 0, 0.5]));
    local[1] = THUMB_BASE;
    let at = THUMB_BASE;
    for (let i = 0; i < 3; i++) {
      direction = rotate(direction, axis, i === 0 ? 0 : (thumb.bend ?? 0));
      at = add(at, scale(direction, THUMB_SEGMENTS[i]!));
      local[2 + i] = at;
    }
  }

  const mirror = pose.hand === 'left' ? -1 : 1;
  const [cs, ss] = [Math.cos(pose.side), Math.sin(pose.side)];
  const [ct, st] = [Math.cos(pose.turn), Math.sin(pose.turn)];
  return local.map(([X, Y, Z]) => {
    // Turn about the hand's own length, mirror for a left hand, then turn in the picture.
    const x1 = (X * cs + Z * ss) * mirror;
    const z1 = -X * ss + Z * cs;
    const x2 = x1 * ct + Y * st;
    const y2 = -x1 * st + Y * ct;
    // Up the hand is up the picture (smaller y); out of the palm is towards the camera (smaller z).
    return { x: pose.x + x2 * pose.size, y: pose.y - y2 * pose.size, z: -z1 * pose.size };
  });
}

const straight = (): FingerPose => ({ knuckle: 0, curl: 0 });

/** A relaxed open hand in the middle of a 4:3 picture. Callers change what they need. */
export function openHand(): Pose {
  return {
    fingers: { index: straight(), middle: straight(), ring: straight(), little: straight() },
    thumb: { out: 0.75 },
    fan: 1,
    hand: 'right',
    x: 2 / 3,
    y: 0.7,
    size: 0.18,
    turn: 0,
    side: 0,
  };
}

export function fist(): Pose {
  const folded = (): FingerPose => ({ knuckle: 1.4, curl: 1.5 });
  return {
    ...openHand(),
    fingers: { index: folded(), middle: folded(), ring: folded(), little: folded() },
    thumb: { touch: FINGER_JOINTS.middle[1] },
    fan: 0.3,
  };
}
