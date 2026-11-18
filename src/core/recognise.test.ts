import { describe, expect, it } from 'vitest';
import { describePair, describePose } from './describe';
import { TIP } from './hand';
import { fist, modelHand, openHand, type Pose } from './handModel';
import { ONE_HANDED, PUPPETS, TWO_HANDED, oneHanded, puppet, puppetHands, type PairPuppet } from './puppets';
import { checkScore, COUNTS, recognise, recognisePair, score } from './recognise';

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

describe('the puppets', () => {
  it('are animals and things: seven for one hand, and the butterfly and the heart for two', () => {
    expect(ONE_HANDED.map((p) => p.id)).toEqual(['rabbit', 'dog', 'duck', 'spider', 'walker', 'candle', 'tree']);
    expect(TWO_HANDED.map((p) => p.id)).toEqual(['butterfly', 'heart']);
    expect(PUPPETS).toHaveLength(9);
  });

  it('turning a puppet upside down makes a different one: the rabbit walks, the tree hangs as a spider', () => {
    for (const [up, down] of [['rabbit', 'walker'], ['tree', 'spider']] as const) {
      const flipped = { ...oneHanded(up).pose(0), turn: Math.PI };
      expect(recognise(describeHand(flipped))[0]!.puppet.id).toBe(down);
    }
  });
});

describe('recognising puppets', () => {
  for (const p of ONE_HANDED) {
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

  it('a rabbit with its folded fingers half open is not a tree', () => {
    const pose = oneHanded('rabbit').pose(0);
    pose.fingers.ring = { knuckle: 0.5, curl: 0.3 };
    pose.fingers.little = { knuckle: 0.5, curl: 0.3 };
    expect(score(describeHand(pose), oneHanded('tree')).score).toBeLessThan(COUNTS);
  });

  it('a fist and a relaxed open hand are no puppet', () => {
    for (const pose of [...variants(fist()), ...variants(openHand())]) {
      expect(recognise(describeHand(pose))[0]!.score).toBeLessThan(COUNTS);
    }
  });

  it('a puppet that is nearly right still counts', () => {
    const rabbit = oneHanded('rabbit');
    const loose = rabbit.pose(0);
    loose.thumb = { touch: TIP.ring, gap: 0.25 };
    expect(score(describeHand(loose), rabbit).score).toBeGreaterThanOrEqual(COUNTS);
  });
});

describe('recognising two-handed puppets', () => {
  const pair = (p: PairPuppet, action: number) => {
    const [a, b] = puppetHands(p, action);
    return describePair(a!, b!);
  };

  for (const p of TWO_HANDED) {
    it(`the ${p.name.toLowerCase()} is recognised as the ${p.name.toLowerCase()}, and not as the other two-handed puppet`, () => {
      for (const action of [0, 1]) {
        const [best, next] = recognisePair(pair(p, action));
        expect(best!.puppet.id).toBe(p.id);
        expect(best!.score).toBeGreaterThanOrEqual(COUNTS);
        expect(next!.score).toBeLessThan(COUNTS);
      }
    });
  }

  it('the order the tracker lists the two hands in does not matter', () => {
    const [a, b] = puppetHands(puppet('butterfly'), 0);
    expect(recognisePair(describePair(b!, a!))[0]!.score).toBeCloseTo(recognisePair(describePair(a!, b!))[0]!.score);
  });

  it('two people making their own puppets side by side are not a two-handed puppet', () => {
    const rabbit = modelHand({ ...oneHanded('rabbit').pose(0), x: 0.4 });
    const duck = modelHand({ ...oneHanded('duck').pose(0), x: 1.0 });
    expect(recognisePair(describePair(rabbit, duck))[0]!.score).toBeLessThan(COUNTS);
  });

  it('two trees side by side are not a butterfly: the thumbs do not touch', () => {
    const left = modelHand({ ...oneHanded('tree').pose(0), x: 0.4 });
    const right = modelHand({ ...oneHanded('tree').pose(0), hand: 'left', x: 1.0 });
    expect(recognisePair(describePair(left, right))[0]!.score).toBeLessThan(COUNTS);
  });

  it('a heart with its fingertips apart at the top is told to bring them together', () => {
    const [a, b] = puppetHands(puppet('heart'), 0);
    // Tip the second hand outwards about its thumb tip, as a heart opens at the top.
    const pivot = b![4]!;
    const [c, sn] = [Math.cos(0.6), Math.sin(0.6)];
    const opened = b!.map((p) => ({
      x: pivot.x + (p.x - pivot.x) * c - (p.y - pivot.y) * sn,
      y: pivot.y + (p.x - pivot.x) * sn + (p.y - pivot.y) * c,
      z: p.z,
    }));
    const [best] = recognisePair(describePair(a!, opened));
    expect(best!.puppet.id).toBe('heart');
    expect(best!.hint).toMatch(/fingertips/i);
  });

  it('a butterfly with its thumbs apart is told to hook them together', () => {
    const [a, b] = puppetHands(puppet('butterfly'), 0);
    const apart = b!.map((p) => ({ ...p, x: p.x + 0.25 }));
    const [best] = recognisePair(describePair(a!, apart));
    expect(best!.puppet.id).toBe('butterfly');
    expect(best!.hint).toMatch(/thumbs/i);
  });
});

describe('hints', () => {
  const rabbit = oneHanded('rabbit');

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
    for (const p of [oneHanded('duck'), oneHanded('dog')]) {
      expect(p.action!(describeHand(p.pose(0)))).toBeLessThan(0.2);
      expect(p.action!(describeHand(p.pose(1)))).toBeGreaterThan(0.8);
    }
  });
});
