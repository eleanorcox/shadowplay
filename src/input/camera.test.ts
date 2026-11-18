import { describe, expect, it } from 'vitest';
import { toPictureUnits } from './camera';

describe('toPictureUnits', () => {
  it('measures across the picture on the same scale as down it', () => {
    const [[p]] = toPictureUnits([[{ x: 0.5, y: 0.5, z: 0.1, visibility: 0 }]], 16 / 9) as [[{ x: number; y: number; z: number }]];
    expect(p.x).toBeCloseTo(8 / 9);
    expect(p.y).toBe(0.5);
    expect(p.z).toBeCloseTo(0.1 * (16 / 9));
  });
});
