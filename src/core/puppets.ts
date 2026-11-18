// The puppets: what each one checks for, the hint for each check, how the model hand makes it, where its eye
// goes and what it does once made. The hand positions are the common ones, from memory (unchecked).
import type { Description } from './describe';
import { TIP } from './hand';
import { openHand, type FingerPose, type Pose } from './handModel';

export type PuppetId = 'rabbit' | 'duck' | 'dog';

export interface Check {
  measure: (d: Description) => number;
  /** Fully right inside this range. */
  range: readonly [number, number];
  /** How far outside the range still partly counts. */
  margin: number;
  /** How much this check matters next to the others; 1 if not given. */
  weight?: number;
  /** What to say when this is the check furthest off; one for each side when they differ. */
  hint: string | { low: string; high: string };
}

export interface Puppet {
  id: PuppetId;
  name: string;
  checks: readonly Check[];
  /** The model hand making this puppet, doing its action by `action` (0 to 1). A fresh object every call. */
  pose: (action: number) => Pose;
  /** Where the eye goes: hand points and their weights. */
  eye: readonly (readonly [number, number])[];
  /** How much the puppet is doing its thing (opening its beak), 0 to 1, if it has a thing to do. */
  action?: (d: Description) => number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const straight = (knuckle = 0): FingerPose => ({ knuckle, curl: 0 });
const folded = (): FingerPose => ({ knuckle: 1.4, curl: 1.4 });

const rabbit: Puppet = {
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
  eye: [[5, 2], [13, 1], [3, 1.2]],
};

const duck: Puppet = {
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
    { measure: (d) => d.pointing, range: [0.9, 2.2], margin: 0.6, hint: 'Point your hand to the side' },
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
  eye: [[5, 2], [9, 1.5], [6, 1]],
  action: (d) => clamp01((Math.min(d.touch[0], d.touch[1]) - 0.25) / 0.35),
};

const dog: Puppet = {
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
  eye: [[5, 1], [9, 1.2], [6, 1.3]],
  action: (d) => clamp01((d.mouth - 0.45) / 0.35),
};

export const PUPPETS: readonly Puppet[] = [rabbit, duck, dog];

export function puppet(id: PuppetId): Puppet {
  return PUPPETS.find((p) => p.id === id)!;
}
