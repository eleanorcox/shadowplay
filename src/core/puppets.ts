// The puppets: what each one checks for, the hint for each check, how the model hand makes it, where its eyes
// go and what it does once made. The hand positions are the common ones, from memory (unchecked).
import type { Description, PairDescription } from './describe';
import { mix, TIP, type Landmark } from './hand';
import { modelHand, openHand, type FingerPose, type Pose } from './handModel';

export type PuppetId = 'rabbit' | 'duck' | 'dog' | 'swan' | 'spider' | 'bird' | 'butterfly';

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
      weight: 1.5,
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
      hint: 'Touch your thumb to your folded fingers',
    },
    // Ears to the side still counts; upside down does not.
    { measure: (d) => d.pointing, range: [0, 0.9], margin: 0.9, hint: 'Point the ears up to the sky' },
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
    // Pointing down instead makes a swan, so this matters more.
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

const swan: OneHandedPuppet = {
  hands: 1,
  id: 'swan',
  name: 'Swan',
  checks: [
    { measure: (d) => Math.max(...d.bend), range: [0, 0.3], margin: 0.35, hint: 'Keep your fingers straight' },
    // Tighter than the duck's, so a spider's spread legs are not a swan.
    { measure: (d) => Math.max(...d.apart), range: [0, 0.2], margin: 0.2, hint: 'Hold your fingers together' },
    {
      measure: (d) => Math.min(d.touch[0], d.touch[1]),
      range: [0, 0.8],
      margin: 0.25,
      hint: 'Touch your thumb to your fingertips for a beak',
    },
    // The arm is the neck, so the hand droops down from the wrist.
    { measure: (d) => d.pointing, range: [2.3, Math.PI], margin: 0.5, weight: 1.5, hint: 'Lift your arm and let your hand droop down' },
  ],
  pose: (action) => ({ ...duck.pose(action), turn: -2.6, x: 0.78, y: 0.3 }),
  eyes: [[[5, 2], [9, 1.5], [6, 1]]],
  action: duck.action,
};

const spider: OneHandedPuppet = {
  hands: 1,
  id: 'spider',
  name: 'Spider',
  checks: [
    { measure: (d) => d.pointing, range: [2.4, Math.PI], margin: 0.6, weight: 1.5, hint: 'Hang your hand down, fingers to the floor' },
    {
      measure: (d) => (d.apart[0] + d.apart[1] + d.apart[2]) / 3,
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

const bird: PairPuppet = {
  hands: 2,
  id: 'bird',
  name: 'Bird',
  checks: [
    thumbsHooked,
    { measure: both((d) => Math.max(...d.bend), 'max'), range: [0, 0.35], margin: 0.35, hint: 'Stretch your fingers out straight' },
    // Fingers together and out to the sides are what tell a bird from a butterfly.
    { measure: both((d) => Math.max(...d.apart), 'max'), range: [0, 0.2], margin: 0.15, hint: 'Hold your fingers together like wings' },
    {
      measure: both((d) => Math.abs(d.pointing - Math.PI / 2), 'max'),
      range: [0, 0.45],
      margin: 0.45,
      weight: 1.5,
      hint: 'Stretch your wings out to the sides',
    },
  ],
  pose: (action) => {
    const right: Pose = {
      ...openHand(),
      fingers: { index: straight(0.05), middle: straight(0.05), ring: straight(0.05), little: straight(0.05) },
      thumb: { out: 2.2 },
      fan: 0,
      turn: -Math.PI / 2 + 0.3 * (action - 0.5),
    };
    return hooked(right, 0.667, 0.42);
  },
  // The hooked thumbs are the head.
  eyes: ([first]) => [mix(first!, [[3, 1], [4, 1.2], [2, 0.4]])],
};

const butterfly: PairPuppet = {
  hands: 2,
  id: 'butterfly',
  name: 'Butterfly',
  checks: [
    thumbsHooked,
    { measure: both((d) => Math.max(...d.bend), 'max'), range: [0, 0.4], margin: 0.35, hint: 'Stretch your fingers out straight' },
    {
      measure: both((d) => (d.apart[0] + d.apart[1] + d.apart[2]) / 3, 'min'),
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

export const ONE_HANDED: readonly OneHandedPuppet[] = [rabbit, duck, dog, swan, spider];
export const TWO_HANDED: readonly PairPuppet[] = [bird, butterfly];
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
