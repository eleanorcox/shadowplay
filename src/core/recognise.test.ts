import { describe, expect, it } from 'vitest';
import { describePose } from './describe';
import { TIP } from './hand';
import { fist, modelHand, openHand, type Pose } from './handModel';
import { PUPPETS, puppet } from './puppets';
import { checkScore, COUNTS, recognise, score } from './recognise';

const describeHand = (pose: Pose) => describePose(modelHand(pose));

/** The same pose made by different people: either hand, other places in the picture, smaller and bigger. */
function variants(pose: Pose): Pose[] {
  const mirrored = { ...pose, hand: pose.hand === 'left' ? ('right' as const) : ('left' as const), turn: -pose.turn };
  return [pose, mirrored, { ...pose, x: 0.4, y: 0.5 }, { ...pose, size: 0.09 }, { ...mirrored, size: 0.3 }];
}

describe('checkScore', () => {
  const check = { measure: () => 0, range: [0.2, 0.4] as const, margin: 0.2, hint: '' };
  it('is 1 inside the range, partly counts within the margin, and 0 beyond it', () => {
    expect(checkScore(check, 0.3)).toBe(1);
    expect(checkScore(check, 0.5)).toBeCloseTo(0.5);
    expect(checkScore(check, 0.1)).toBeCloseTo(0.5);
    expect(checkScore(check, 0.9)).toBe(0);
  });
});

describe('recognising puppets', () => {
  for (const p of PUPPETS) {
    it(`the ${p.name.toLowerCase()} pose is recognised as the ${p.name.toLowerCase()}, and as nothing else`, () => {
      for (const action of [0, 1]) {
        for (const pose of variants(p.pose(action))) {
          const [best, next] = recognise(describeHand(pose));
          expect(best!.puppet.id).toBe(p.id);
          expect(best!.score).toBeGreaterThanOrEqual(COUNTS);
          expect(next!.score).toBeLessThan(COUNTS);
        }
      }
    });
  }

  it('a fist and a relaxed open hand are no puppet', () => {
    for (const pose of [...variants(fist()), ...variants(openHand())]) {
      expect(recognise(describeHand(pose))[0]!.score).toBeLessThan(COUNTS);
    }
  });

  it('a puppet that is nearly right still counts', () => {
    const rabbit = puppet('rabbit');
    const loose = rabbit.pose(0);
    loose.thumb = { touch: TIP.ring, gap: 0.25 };
    expect(score(describeHand(loose), rabbit).score).toBeGreaterThanOrEqual(COUNTS);
  });
});

describe('hints', () => {
  const rabbit = puppet('rabbit');

  it('a rabbit with its thumb out is told to touch its thumb to its folded fingers', () => {
    const pose = rabbit.pose(0);
    pose.thumb = { out: 0.8 };
    const result = score(describeHand(pose), rabbit);
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.score).toBeLessThan(COUNTS);
    expect(result.hint).toMatch(/thumb/i);
  });

  it('a rabbit with its ring finger up is told to fold it down', () => {
    const pose = rabbit.pose(0);
    pose.fingers.ring = { knuckle: 0, curl: 0 };
    pose.fingers.little = { knuckle: 0, curl: 0 };
    pose.thumb = { out: 0.8 };
    expect(score(describeHand(pose), rabbit).hint).toMatch(/fold/i);
  });

  it('an upside-down rabbit is told to point its ears up', () => {
    const pose = { ...rabbit.pose(0), turn: Math.PI };
    expect(score(describeHand(pose), rabbit).hint).toMatch(/up/i);
  });

  it('a recognised puppet has no hint', () => {
    expect(score(describeHand(rabbit.pose(0)), rabbit).hint).toBeUndefined();
  });
});

describe('actions', () => {
  it('the duck opens its beak and the dog its mouth', () => {
    for (const p of [puppet('duck'), puppet('dog')]) {
      expect(p.action!(describeHand(p.pose(0)))).toBeLessThan(0.2);
      expect(p.action!(describeHand(p.pose(1)))).toBeGreaterThan(0.8);
    }
  });
});
