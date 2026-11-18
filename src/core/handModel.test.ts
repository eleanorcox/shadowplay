import { describe, expect, it } from 'vitest';
import { FINGER_JOINTS, POINTS, TIP } from './hand';
import { modelHand, openHand, type Pose } from './handModel';

const length = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('modelHand', () => {
  it('gives the 21 points MediaPipe gives', () => {
    expect(modelHand(openHand())).toHaveLength(POINTS);
  });

  it('puts the wrist where it is asked to, with fingers pointing up the picture by default', () => {
    const points = modelHand({ ...openHand(), x: 0.6, y: 0.8, size: 0.2 });
    expect(points[0]).toMatchObject({ x: 0.6, y: 0.8 });
    // Up the picture is smaller y.
    expect(points[TIP.middle]!.y).toBeLessThan(0.8 - 0.2);
  });

  it('a palm the size asked for: wrist to middle knuckle', () => {
    const points = modelHand({ ...openHand(), size: 0.15 });
    expect(length(points[0]!, points[FINGER_JOINTS.middle[0]]!)).toBeCloseTo(0.15, 2);
  });

  it('a turned hand points its fingers to the side', () => {
    const points = modelHand({ ...openHand(), turn: Math.PI / 2 });
    expect(points[TIP.middle]!.x).toBeGreaterThan(points[0]!.x + 0.1);
  });

  it('a left hand is a mirror image of a right hand', () => {
    const pose: Pose = { ...openHand(), x: 0.5 };
    const right = modelHand(pose);
    const left = modelHand({ ...pose, hand: 'left' });
    for (let i = 0; i < POINTS; i++) {
      expect(left[i]!.x).toBeCloseTo(1 - right[i]!.x);
      expect(left[i]!.y).toBeCloseTo(right[i]!.y);
    }
  });

  it('a thumb asked to touch a fingertip ends at that fingertip', () => {
    const pose: Pose = { ...openHand(), thumb: { touch: TIP.ring } };
    pose.fingers.ring = { knuckle: 1.2, curl: 1.3 };
    const points = modelHand(pose);
    expect(length(points[TIP.thumb]!, points[TIP.ring]!)).toBeLessThan(0.2 * pose.size);
  });
});
