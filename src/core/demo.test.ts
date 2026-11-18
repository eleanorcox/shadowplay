import { describe, expect, it } from 'vitest';
import { DEMO_LENGTH, demoHands, stillHands } from './demo';
import { PUPPETS } from './puppets';
import { Stage } from './stage';

describe('the demonstration', () => {
  it('is one or two hands of 21 points at any moment', () => {
    for (let t = 0; t < DEMO_LENGTH; t += 0.7) {
      const hands = demoHands(t);
      expect([1, 2]).toContain(hands.length);
      for (const hand of hands) expect(hand).toHaveLength(21);
    }
  });

  it('makes every puppet once in each loop, recognised by the real stage', () => {
    const stage = new Stage();
    for (let t = 0; t < DEMO_LENGTH; t += 1 / 30) stage.update(demoHands(t), t);
    expect([...stage.made].sort()).toEqual(PUPPETS.map((p) => p.id).sort());
  });

  it('loops smoothly: the end of one loop meets the start of the next', () => {
    const end = demoHands(DEMO_LENGTH - 1e-6)[0]!;
    const start = demoHands(0)[0]!;
    end.forEach((p, i) => expect(Math.hypot(p.x - start[i]!.x, p.y - start[i]!.y)).toBeLessThan(0.01));
  });
});

describe('still scenes', () => {
  it('each puppet scene shows that puppet', () => {
    for (const p of PUPPETS) {
      const stage = new Stage();
      for (let t = 0; t < 1.5; t += 1 / 30) stage.update(stillHands(p.id)!, t);
      expect(p.hands === 1 ? stage.hands[0]!.alive : stage.pairs[0]?.alive).toBe(p.id);
    }
  });
});
