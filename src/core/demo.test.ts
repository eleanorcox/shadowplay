import { describe, expect, it } from 'vitest';
import { DEMO_LENGTH, demoHands, stillHands } from './demo';
import { PUPPETS } from './puppets';
import { Stage } from './stage';

describe('the demonstration', () => {
  it('is one hand of 21 points at any moment', () => {
    for (const t of [0, 1.3, 7.7, DEMO_LENGTH * 2.5]) {
      const hands = demoHands(t);
      expect(hands).toHaveLength(1);
      expect(hands[0]).toHaveLength(21);
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
      expect(stage.hands[0]!.alive).toBe(p.id);
    }
  });
});
