import { describe, expect, it } from 'vitest';
import type { Landmark } from './hand';
import { fist, modelHand, type Pose } from './handModel';
import { oneHanded, puppet, puppetHands } from './puppets';
import { Stage, STAGE_TIMES } from './stage';

/** Camera frames arrive about 30 times a second. */
const FRAME = 1 / 30;

/** Feeds the same hands for some seconds of camera frames, starting after `from`; returns the time reached. */
function hold(stage: Stage, hands: Landmark[][], seconds: number, from: number): number {
  let time = from;
  const end = from + seconds;
  while (time < end - 1e-9) stage.update(hands, (time += FRAME));
  return time;
}

const rabbit = () => modelHand(oneHanded('rabbit').pose(0));
const nearlyRabbit = (): Landmark[] => {
  const pose: Pose = oneHanded('rabbit').pose(0);
  pose.thumb = { out: 0.8 };
  return modelHand(pose);
};

describe('Stage', () => {
  it('waits until somebody holds up a hand', () => {
    const stage = new Stage();
    expect(stage.waiting).toBe(true);
    hold(stage, [modelHand(fist())], 0.2, 0);
    expect(stage.waiting).toBe(false);
    expect(stage.hands).toHaveLength(1);
  });

  it('a puppet comes alive only once it has been held for a moment', () => {
    const stage = new Stage();
    let time = hold(stage, [rabbit()], STAGE_TIMES.hold * 0.5, 0);
    expect(stage.hands[0]!.alive).toBeUndefined();
    time = hold(stage, [rabbit()], STAGE_TIMES.hold, time);
    expect(stage.hands[0]!.alive).toBe('rabbit');
    expect(stage.made.has('rabbit')).toBe(true);
  });

  it('a moment of lost tracking does not end a puppet or lose the hand', () => {
    const stage = new Stage();
    let time = hold(stage, [rabbit()], 1.5, 0);
    const id = stage.hands[0]!.id;
    time = hold(stage, [], STAGE_TIMES.lost * 0.6, time);
    time = hold(stage, [rabbit()], 0.1, time);
    expect(stage.hands).toHaveLength(1);
    expect(stage.hands[0]!.id).toBe(id);
    expect(stage.hands[0]!.alive).toBe('rabbit');
  });

  it('a puppet ends when the hand lets go of the shape', () => {
    const stage = new Stage();
    let time = hold(stage, [rabbit()], 1.5, 0);
    time = hold(stage, [modelHand(fist())], 1.5, time);
    expect(stage.hands[0]!.alive).toBeUndefined();
    // But it still counts as made this visit.
    expect(stage.made.has('rabbit')).toBe(true);
  });

  it('follows a hand that moves, keeping its identity', () => {
    const stage = new Stage();
    let time = 0;
    const pose = oneHanded('rabbit').pose(0);
    stage.update([modelHand(pose)], (time += FRAME));
    const id = stage.hands[0]!.id;
    for (let i = 0; i < 20; i++) stage.update([modelHand({ ...pose, x: pose.x + i * 0.01 })], (time += FRAME));
    expect(stage.hands).toHaveLength(1);
    expect(stage.hands[0]!.id).toBe(id);
  });

  it('two hands are two puppets', () => {
    const stage = new Stage();
    const duck = modelHand({ ...oneHanded('duck').pose(0), x: 0.3 });
    hold(stage, [rabbit(), duck], 1.5, 0);
    expect(stage.hands.map((h) => h.alive).sort()).toEqual(['duck', 'rabbit']);
    expect(new Set(stage.hands.map((h) => h.id)).size).toBe(2);
  });

  it('nobody in view for long enough: back to waiting, and the stars are cleared for the next visitors', () => {
    const stage = new Stage();
    let time = hold(stage, [rabbit()], 1.5, 0);
    time = hold(stage, [], STAGE_TIMES.waitAfter * 0.5, time);
    expect(stage.waiting).toBe(false);
    expect(stage.made.size).toBe(1);
    time = hold(stage, [], STAGE_TIMES.waitAfter * 0.6, time);
    expect(stage.waiting).toBe(true);
    expect(stage.made.size).toBe(0);
  });

  it('suggests the first puppet not made yet', () => {
    const stage = new Stage();
    expect(stage.suggestion).toBe('rabbit');
    hold(stage, [rabbit()], 1.5, 0);
    expect(stage.suggestion).toBe('dog');
  });

  describe('hints', () => {
    it('a nearly-puppet gets a hint once it has been tried for a moment, not straight away', () => {
      const stage = new Stage();
      let time = hold(stage, [nearlyRabbit()], 0.3, 0);
      expect(stage.hands[0]!.hint).toBeUndefined();
      time = hold(stage, [nearlyRabbit()], STAGE_TIMES.hintAfter, time);
      expect(stage.hands[0]!.nearest).toBe('rabbit');
      expect(stage.hands[0]!.hint).toMatch(/thumb/i);
    });

    it('a hint stays up long enough to read and act on', () => {
      const stage = new Stage();
      let time = hold(stage, [nearlyRabbit()], STAGE_TIMES.hintAfter + 0.2, 0);
      const first = stage.hands[0]!.hint;
      // A different mistake on the same puppet does not replace the hint at once.
      const other = oneHanded('rabbit').pose(0);
      other.thumb = { out: 0.8 };
      other.fingers.index = { knuckle: 0, curl: 0.45 };
      time = hold(stage, [modelHand(other)], 0.5, time);
      expect(stage.hands[0]!.hint).toBe(first);
    });

    it('no hint once the puppet is made', () => {
      const stage = new Stage();
      let time = hold(stage, [nearlyRabbit()], STAGE_TIMES.hintAfter + 0.2, 0);
      time = hold(stage, [rabbit()], 1.5, time);
      expect(stage.hands[0]!.hint).toBeUndefined();
    });
  });

  it('a live duck opens its beak as the hand opens', () => {
    const stage = new Stage();
    const duck = oneHanded('duck');
    let time = hold(stage, [modelHand(duck.pose(0))], 1.5, 0);
    expect(stage.hands[0]!.action).toBeLessThan(0.2);
    time = hold(stage, [modelHand(duck.pose(1))], 0.5, time);
    expect(stage.hands[0]!.alive).toBe('duck');
    expect(stage.hands[0]!.action).toBeGreaterThan(0.7);
  });

  describe('two-handed puppets', () => {
    it('two hands making a butterfly are one puppet, not two', () => {
      const stage = new Stage();
      hold(stage, puppetHands(puppet('butterfly'), 0), 1.5, 0);
      expect(stage.pairs).toHaveLength(1);
      expect(stage.pairs[0]!.alive).toBe('butterfly');
      expect(stage.hands.every((h) => h.alive === undefined && h.pairedWith !== undefined)).toBe(true);
      expect(stage.made.has('butterfly')).toBe(true);
    });

    it('a butterfly wins over the trees each of its hands looks like on its own', () => {
      const stage = new Stage();
      hold(stage, puppetHands(puppet('butterfly'), 0), 1.5, 0);
      expect(stage.pairs[0]?.alive).toBe('butterfly');
      expect(stage.made.has('tree')).toBe(false);
    });

    it('a heart is one puppet made by two hands', () => {
      const stage = new Stage();
      hold(stage, puppetHands(puppet('heart'), 0), 1.5, 0);
      expect(stage.pairs[0]?.alive).toBe('heart');
    });

    it('two people making their own puppets are left as two puppets', () => {
      const stage = new Stage();
      const duck = modelHand({ ...oneHanded('duck').pose(0), x: 0.3 });
      hold(stage, [rabbit(), duck], 1.5, 0);
      expect(stage.pairs).toHaveLength(0);
      expect(stage.hands.map((h) => h.alive).sort()).toEqual(['duck', 'rabbit']);
    });

    it('when the hands part, the pair ends and each hand is its own again', () => {
      const stage = new Stage();
      let time = hold(stage, puppetHands(puppet('butterfly'), 0), 1.5, 0);
      time = hold(stage, [rabbit()], 2, time);
      expect(stage.pairs).toHaveLength(0);
      expect(stage.hands[0]!.alive).toBe('rabbit');
    });
  });
});
