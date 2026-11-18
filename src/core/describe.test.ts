import { describe, expect, it } from 'vitest';
import { describePose } from './describe';
import { TIP } from './hand';
import { fist, modelHand, openHand, type Pose } from './handModel';

describe('describePose', () => {
  it('reads straight fingers as straight and folded ones as folded', () => {
    expect(describePose(modelHand(openHand())).bend.every((b) => b < 0.15)).toBe(true);
    expect(describePose(modelHand(fist())).bend.every((b) => b > 0.7)).toBe(true);
  });

  it('measures how close the thumb is to each fingertip, in palm lengths', () => {
    const pose: Pose = { ...openHand(), thumb: { touch: TIP.index } };
    const { touch } = describePose(modelHand(pose));
    expect(touch[0]).toBeLessThan(0.2);
    expect(touch[3]).toBeGreaterThan(0.5);
  });

  it('knows fingers held together from fingers spread', () => {
    expect(describePose(modelHand({ ...openHand(), fan: 0 })).apart[0]).toBeLessThan(0.1);
    expect(describePose(modelHand({ ...openHand(), fan: 2.5 })).apart[0]).toBeGreaterThan(0.25);
  });

  it('says which way the fingers point: 0 is straight up, π/2 is sideways either way', () => {
    expect(describePose(modelHand(openHand())).pointing).toBeLessThan(0.15);
    expect(describePose(modelHand({ ...openHand(), turn: Math.PI / 2 })).pointing).toBeCloseTo(Math.PI / 2, 1);
    expect(describePose(modelHand({ ...openHand(), turn: -Math.PI / 2 })).pointing).toBeCloseTo(Math.PI / 2, 1);
  });

  it('says whether the thumb sticks up above a sideways hand, for either hand', () => {
    // A right hand pointing left has its thumb on top; a left hand pointing right likewise.
    const right = describePose(modelHand({ ...openHand(), turn: -Math.PI / 2, thumb: { out: 0.6 } }));
    const left = describePose(modelHand({ ...openHand(), hand: 'left', turn: Math.PI / 2, thumb: { out: 0.6 } }));
    expect(right.thumbAbove).toBeGreaterThan(0.2);
    expect(left.thumbAbove).toBeCloseTo(right.thumbAbove);
  });

  it('is the same wherever the hand is, however big, and for either hand', () => {
    const pose: Pose = { ...openHand(), turn: 0.3, fan: 1.5, thumb: { touch: TIP.middle } };
    const base = describePose(modelHand(pose));
    for (const changed of [
      { ...pose, x: 0.2, y: 0.3 },
      { ...pose, size: 0.08 },
      { ...pose, hand: 'left' as const, turn: -0.3 },
    ]) {
      const other = describePose(modelHand(changed));
      expect(other.bend.map((v) => v.toFixed(3))).toEqual(base.bend.map((v) => v.toFixed(3)));
      expect(other.touch.map((v) => v.toFixed(3))).toEqual(base.touch.map((v) => v.toFixed(3)));
      expect(other.apart.map((v) => v.toFixed(3))).toEqual(base.apart.map((v) => v.toFixed(3)));
      expect(other.pointing).toBeCloseTo(base.pointing);
    }
  });
});
