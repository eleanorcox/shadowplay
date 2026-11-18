// The puppets: what each one checks for, the hint for each check, how the model hand makes it, where its eyes
// go and what it does once made. The hand positions are the common ones, from memory (unchecked).
import type { Description, PairDescription } from './describe';
import { FINGER_JOINTS, mix, TIP, type Landmark } from './hand';
import { modelHand, openHand, type FingerPose, type Pose } from './handModel';

export type PuppetId = 'rabbit' | 'dog' | 'duck' | 'spider' | 'walker' | 'candle' | 'tree' | 'butterfly' | 'heart';

export interface Check<D = Description> {
  measure: (d: D) => number;
  /** Fully right inside this range. */
  range: readonly [number, number];
  /** How far outside the range still partly counts. */
  margin: number;
  /** How much this check matters next to the others; 1 if not given. */
  weight?: number;
  /** What to say when this is the check furthest off; one for each side when they differ. */
  hint: string | { low: string; high: string };
}

/** Hand points and their weights, mixed to find a spot on the hand. */
type Spot = readonly (readonly [number, number])[];

export interface OneHandedPuppet {
  hands: 1;
  id: PuppetId;
  name: string;
  checks: readonly Check[];
  /** The model hand making this puppet, doing its action by `action` (0 to 1). A fresh object every call. */
  pose: (action: number) => Pose;
  /** Where the eyes go, usually one. */
  eyes: readonly Spot[];
  /** How much the puppet is doing its thing (opening its beak), 0 to 1, if it has a thing to do. */
  action?: (d: Description) => number;
}

export interface PairPuppet {
  hands: 2;
  id: PuppetId;
  name: string;
  checks: readonly Check<PairDescription>[];
  /** The two model hands, the one further left in the picture first, moving by `action` (0 to 1). */
  pose: (action: number) => [Pose, Pose];
  /** Where the eyes go, given both hands, the one further left in the picture first. */
  eyes: (hands: readonly (readonly Landmark[])[]) => Landmark[];
}

export type Puppet = OneHandedPuppet | PairPuppet;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** How spread the fingers are: the average angle between neighbours. */
const spread = (d: Description) => (d.apart[0] + d.apart[1] + d.apart[2]) / 3;
const straight = (knuckle = 0): FingerPose => ({ knuckle, curl: 0 });
const folded = (): FingerPose => ({ knuckle: 1.4, curl: 1.4 });

const rabbit: OneHandedPuppet = {
  hands: 1,
  id: 'rabbit',
  name: 'Rabbit',
  checks: [
    {
      measure: (d) => Math.max(d.bend[0], d.bend[1]),
      range: [0, 0.3],
      margin: 0.35,
      // The ears are what make it a rabbit rather than a fist.
      weight: 2,
      hint: 'Stand two fingers up straight for the ears',
    },
    {
      measure: (d) => Math.min(d.bend[2], d.bend[3]),
      range: [0.55, 1],
      margin: 0.4,
      hint: 'Fold your other two fingers down',
    },
    {
      measure: (d) => Math.min(d.touch[2], d.touch[3]),
      range: [0, 0.5],
      margin: 0.5,
      // Without the thumb holding the folded fingers it is a peace sign, not a rabbit.
      weight: 1.5,
      hint: 'Touch your thumb to your folded fingers',
    },
    // Upside down, the same hand is the walker.
    { measure: (d) => d.pointing, range: [0, 0.9], margin: 0.8, weight: 2, hint: 'Point the ears up to the sky' },
  ],
  pose: () => ({
    ...openHand(),
    fingers: { index: { knuckle: 0, curl: 0, lean: 0.12 }, middle: { knuckle: 0, curl: 0, lean: -0.1 }, ring: folded(), little: folded() },
    thumb: { touch: TIP.ring },
    fan: 1,
    turn: -0.15,
  }),
  // On the face, below the ears and towards the thumb.
  eyes: [[[5, 2], [13, 1], [3, 1.2]]],
};

const duck: OneHandedPuppet = {
  hands: 1,
  id: 'duck',
  name: 'Duck',
  checks: [
    { measure: (d) => Math.max(...d.bend), range: [0, 0.3], margin: 0.35, hint: 'Keep your fingers straight' },
    { measure: (d) => Math.max(...d.apart), range: [0, 0.2], margin: 0.25, hint: 'Hold your fingers together' },
    {
      measure: (d) => Math.min(d.touch[0], d.touch[1]),
      range: [0, 0.8],
      margin: 0.35,
      hint: 'Bring your thumb under your fingers to make a beak',
    },
    {
      measure: (d) => d.thumbAbove,
      range: [-3, 0.1],
      margin: 0.35,
      hint: 'Tuck your thumb underneath your fingers',
    },
    // Pointing sideways is what makes a hand a duck rather than just a hand.
    { measure: (d) => d.pointing, range: [0.9, 2.1], margin: 0.5, weight: 1.5, hint: 'Point your hand to the side' },
  ],
  pose: (action) => ({
    ...openHand(),
    fingers: { index: straight(0.2), middle: straight(0.2), ring: straight(0.2), little: straight(0.2) },
    thumb: { touch: TIP.middle, gap: 0.55 * action },
    fan: 0,
    turn: -Math.PI / 2,
    side: -1.1,
    x: 0.8,
    y: 0.55,
  }),
  // Just behind the beak, at the top of the head.
  eyes: [[[5, 2], [9, 1.5], [6, 1]]],
  action: (d) => clamp01((Math.min(d.touch[0], d.touch[1]) - 0.25) / 0.35),
};

const dog: OneHandedPuppet = {
  hands: 1,
  id: 'dog',
  name: 'Dog',
  checks: [
    {
      measure: (d) => Math.max(d.bend[0], d.bend[1], d.bend[2]),
      range: [0, 0.3],
      margin: 0.35,
      hint: 'Keep your fingers straight for the nose',
    },
    { measure: (d) => Math.max(d.apart[0], d.apart[1]), range: [0, 0.2], margin: 0.25, hint: 'Hold your fingers together' },
    // The ear is what tells a dog from a duck, so it weighs more.
    { measure: (d) => d.thumbAbove, range: [0.4, 3], margin: 0.35, weight: 1.5, hint: 'Lift your thumb up for an ear' },
    { measure: (d) => d.pointing, range: [1, 2.1], margin: 0.5, weight: 1.5, hint: 'Point your fingers to the side' },
  ],
  pose: (action) => ({
    ...openHand(),
    fingers: {
      index: straight(0.05),
      middle: straight(0.05),
      ring: straight(0.05),
      little: { knuckle: 0.1, curl: 0.1, lean: -0.75 * action },
    },
    thumb: { out: 1.25, bend: -0.1 },
    fan: 0,
    turn: -Math.PI / 2,
    x: 0.8,
    y: 0.55,
  }),
  // Above the nose, in front of the ear.
  eyes: [[[5, 1], [9, 1.2], [6, 1.3]]],
  action: (d) => clamp01((d.mouth - 0.45) / 0.35),
};

const spider: OneHandedPuppet = {
  hands: 1,
  id: 'spider',
  name: 'Spider',
  checks: [
    { measure: (d) => d.pointing, range: [2.4, Math.PI], margin: 0.6, weight: 1.5, hint: 'Hang your hand down, fingers to the floor' },
    {
      measure: spread,
      range: [0.2, Math.PI],
      margin: 0.12,
      hint: 'Spread your fingers out like legs',
    },
    { measure: (d) => Math.max(...d.bend), range: [0, 0.65], margin: 0.3, hint: 'Let your fingers uncurl a little' },
  ],
  pose: (action) => {
    const leg = (wiggle: number): FingerPose => ({ knuckle: 0.35 + 0.25 * wiggle, curl: 0.45 });
    return {
      ...openHand(),
      fingers: { index: leg(action), middle: leg(1 - action), ring: leg(action), little: leg(1 - action) },
      thumb: { out: 1.1, bend: 0.3 },
      fan: 2.4,
      turn: Math.PI,
      x: 0.67,
      y: 0.28,
    };
  },
  // Two eyes on the body, which is the back of the hand.
  eyes: [
    [[0, 1], [5, 1.4], [9, 1.4]],
    [[0, 1], [13, 1.4], [9, 1.4]],
  ],
};

const walker: OneHandedPuppet = {
  hands: 1,
  id: 'walker',
  name: 'Walker',
  checks: [
    {
      measure: (d) => Math.max(d.bend[0], d.bend[1]),
      range: [0, 0.3],
      margin: 0.35,
      weight: 1.5,
      hint: 'Stretch two fingers out straight for legs',
    },
    { measure: (d) => Math.min(d.bend[2], d.bend[3]), range: [0.55, 1], margin: 0.4, hint: 'Fold your other two fingers down' },
    { measure: (d) => Math.min(d.touch[2], d.touch[3]), range: [0, 0.5], margin: 0.5, hint: 'Hold your folded fingers with your thumb' },
    // The rabbit turned upside down.
    { measure: (d) => d.pointing, range: [2.3, Math.PI], margin: 0.6, weight: 1.5, hint: 'Point your two fingers down to the ground' },
  ],
  pose: (action) => {
    // One leg forward and the other back, swapping as `action` goes from 0 to 1.
    const stride = 0.3 * (1 - 2 * action);
    return {
      ...rabbit.pose(0),
      fingers: {
        index: { knuckle: 0, curl: 0, lean: stride },
        middle: { knuckle: 0, curl: 0, lean: -stride },
        ring: folded(),
        little: folded(),
      },
      turn: Math.PI + 0.1,
      // Low enough that the head it grows when it comes alive stays on the wall.
      x: 0.62,
      y: 0.42,
    };
  },
  eyes: [],
  // A step each time the legs swing apart.
  action: (d) => clamp01(d.apart[0] / 0.5),
};

const candle: OneHandedPuppet = {
  hands: 1,
  id: 'candle',
  name: 'Candle',
  checks: [
    { measure: (d) => d.bend[0], range: [0, 0.3], margin: 0.35, weight: 1.5, hint: 'Point one finger straight up' },
    {
      measure: (d) => Math.min(d.bend[1], d.bend[2], d.bend[3]),
      range: [0.55, 1],
      margin: 0.4,
      weight: 1.5,
      hint: 'Fold your other fingers down',
    },
    { measure: (d) => d.pointing, range: [0, 0.6], margin: 0.6, hint: 'Hold your finger up to the sky' },
  ],
  pose: () => ({
    ...openHand(),
    fingers: { index: straight(), middle: folded(), ring: folded(), little: folded() },
    thumb: { touch: FINGER_JOINTS.middle[1] },
    fan: 0.6,
    turn: 0.05,
    y: 0.78,
  }),
  eyes: [],
};

const tree: OneHandedPuppet = {
  hands: 1,
  id: 'tree',
  name: 'Tree',
  checks: [
    { measure: (d) => d.pointing, range: [0, 0.5], margin: 0.5, weight: 1.5, hint: 'Hold your hand up high' },
    { measure: spread, range: [0.2, Math.PI], margin: 0.12, weight: 1.5, hint: 'Spread your fingers wide like branches' },
    // Every branch right out, from the knuckle: two fingers up and two half folded is not a tree.
    { measure: (d) => Math.max(...d.curl), range: [0, 0.2], margin: 0.25, weight: 1.5, hint: 'Stretch all your fingers out' },
  ],
  pose: (action) => ({
    ...openHand(),
    thumb: { out: 1 },
    fan: 2.3,
    // Swaying in the wind.
    turn: -0.05 + 0.12 * (action - 0.5),
    y: 0.82,
    size: 0.2,
  }),
  eyes: [],
};

/**
 * Two hands whose thumb tips meet at (x, y): the right hand as posed, the left its mirror image, so the pair is
 * symmetrical. The right hand appears on the left of the picture, as the camera faces the visitor.
 */
function hooked(right: Pose, x: number, y: number): [Pose, Pose] {
  const tip = modelHand(right)[TIP.thumb]!;
  const placed: Pose = { ...right, x: right.x + (x - 0.004 - tip.x), y: right.y + (y - tip.y) };
  return [placed, { ...placed, hand: 'left', turn: -placed.turn, x: 2 * x - placed.x }];
}

/** Both hands at once: the worst of the two, so each hand has to be right. */
const both = (measure: (d: Description) => number, worst: 'max' | 'min') => (pair: PairDescription) =>
  Math[worst](measure(pair.hands[0]), measure(pair.hands[1]));

const thumbsHooked: Check<PairDescription> = {
  measure: (pair) => pair.thumbs,
  range: [0, 0.45],
  margin: 0.5,
  weight: 2,
  hint: 'Hook your thumbs together',
};

const butterfly: PairPuppet = {
  hands: 2,
  id: 'butterfly',
  name: 'Butterfly',
  checks: [
    thumbsHooked,
    // Straight fingers are what tell a butterfly from a heart, whose curled fingers also look spread.
    { measure: both((d) => Math.max(...d.bend), 'max'), range: [0, 0.4], margin: 0.35, weight: 1.5, hint: 'Stretch your fingers out straight' },
    {
      measure: both(spread, 'min'),
      range: [0.17, Math.PI],
      margin: 0.1,
      hint: 'Spread your fingers wide like wings',
    },
    { measure: both((d) => d.pointing, 'max'), range: [0, 1.2], margin: 0.4, hint: 'Point your fingers up and out' },
  ],
  pose: (action) => {
    const right: Pose = { ...openHand(), thumb: { out: 1.75 }, fan: 2.3, turn: -0.45 - 0.35 * action };
    return hooked(right, 0.667, 0.66);
  },
  // No eyes: it grows feelers instead, drawn by the wall.
  eyes: () => [],
};

/**
 * Turns `pose` until its index fingertip is straight above (or below) its thumb tip, so that two mirrored
 * hands can meet at both. Searches by halving, between `from` and `to`.
 */
function lineUp(pose: Pose, from: number, to: number): Pose {
  const gap = (turn: number) => {
    const points = modelHand({ ...pose, turn });
    return points[TIP.index]!.x - points[TIP.thumb]!.x;
  };
  let [lo, hi] = [from, to];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(gap(mid)) === Math.sign(gap(lo))) lo = mid;
    else hi = mid;
  }
  return { ...pose, turn: (lo + hi) / 2 };
}

const heart: PairPuppet = {
  hands: 2,
  id: 'heart',
  name: 'Heart',
  checks: [
    { measure: (pair) => pair.thumbs, range: [0, 0.45], margin: 0.5, weight: 2, hint: 'Touch your thumbs together at the bottom' },
    { measure: (pair) => pair.fingertips, range: [0, 0.45], margin: 0.5, weight: 2, hint: 'Touch your fingertips together at the top' },
    { measure: both((d) => d.bend[0], 'min'), range: [0.2, 1], margin: 0.2, hint: 'Curve your fingers round' },
  ],
  pose: (action) => {
    // Seen edge-on, so the fingers curl round towards the other hand in the picture, and the thumbs point down.
    const curled = (more: number): FingerPose => ({ knuckle: 0.55 + more, curl: 0.75 + more });
    const right = lineUp(
      {
        ...openHand(),
        fingers: { index: curled(0), middle: curled(0.15), ring: curled(0.3), little: curled(0.45) },
        thumb: { out: 2.75, forward: 0.5 },
        fan: 0,
        side: Math.PI / 2,
        // A heartbeat: a little bigger, then back.
        size: 0.17 * (1 + 0.05 * action),
      },
      -0.6,
      1.2,
    );
    return hooked(right, 0.667, 0.75);
  },
  // No eyes: it glows from inside instead, drawn by the wall.
  eyes: () => [],
};

export const ONE_HANDED: readonly OneHandedPuppet[] = [rabbit, dog, duck, spider, walker, candle, tree];
export const TWO_HANDED: readonly PairPuppet[] = [butterfly, heart];
/** Every puppet, in the order the cards show them. */
export const PUPPETS: readonly Puppet[] = [...ONE_HANDED, ...TWO_HANDED];

export function puppet(id: PuppetId): Puppet {
  return PUPPETS.find((p) => p.id === id)!;
}

export function oneHanded(id: PuppetId): OneHandedPuppet {
  const p = puppet(id);
  if (p.hands !== 1) throw new Error(`The ${id} needs two hands`);
  return p;
}

/** The model hands making a puppet, as hand points. */
export function puppetHands(p: Puppet, action: number): Landmark[][] {
  return p.hands === 1 ? [modelHand(p.pose(action))] : p.pose(action).map(modelHand);
}

/** Where a puppet's eyes are, given its hands (for two hands, the one further left in the picture first). */
export function puppetEyes(p: Puppet, hands: readonly (readonly Landmark[])[]): Landmark[] {
  return p.hands === 1 ? p.eyes.map((spot) => mix(hands[0]!, spot)) : p.eyes(hands);
}
