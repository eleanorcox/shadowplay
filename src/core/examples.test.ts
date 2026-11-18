// Recordings of real hands, saved with the R key in development (see docs/testing.md). The file name says what
// each one should be: `rabbit-…` must count as the rabbit; `nearly-…` and `not-…` must not count as anything.
import { describe, expect, it } from 'vitest';
import { describePose } from './describe';
import type { Landmark } from './hand';
import { PUPPETS } from './puppets';
import { COUNTS, recognise } from './recognise';

interface Recording {
  aspect: number;
  hands: Landmark[][];
}

const files = import.meta.glob<Recording>('./examples/*.json', { eager: true, import: 'default' });

describe('recordings of real hands', () => {
  it('are named for what they should be', () => {
    for (const path of Object.keys(files)) {
      const name = path.split('/').pop()!;
      expect(name).toMatch(new RegExp(`^(${PUPPETS.map((p) => p.id).join('|')}|nearly|not)-`));
    }
  });

  for (const [path, recording] of Object.entries(files)) {
    const name = path.split('/').pop()!;
    const expected = PUPPETS.find((p) => name.startsWith(`${p.id}-`));
    it(`${name}: ${expected ? `is the ${expected.id}` : 'is no puppet'}`, () => {
      expect(recording.hands.length).toBeGreaterThan(0);
      const [best] = recognise(describePose(recording.hands[0]!));
      if (expected) {
        expect(best!.puppet.id).toBe(expected.id);
        expect(best!.score).toBeGreaterThanOrEqual(COUNTS);
      } else expect(best!.score).toBeLessThan(COUNTS);
    });
  }
});
