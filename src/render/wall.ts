// Draws the wall: lamp light, the shadows of the hands, the eyes of puppets that have come alive, hints, and the
// puppet cards along the bottom. It only reads the stage.
import type { Landmark } from '../core/hand';
import { PUPPETS, puppetEyes, puppetHands, type Puppet, type PuppetId } from '../core/puppets';
import type { PerformerView } from '../core/performer';
import type { Stage, StageHand } from '../core/stage';
import { fillHand, palmLength, type Pt } from './handShape';

const COLOURS = {
  lamp: '#f6dcae',
  wallEdge: '#3a2416',
  shadow: '#1d120c',
  eye: '#fbe6bf',
  card: 'rgba(255, 244, 222, 0.92)',
  cardInk: '#3b2618',
  skin: '#e9b98f',
  glow: '#ffcf5a',
  hint: 'rgba(255, 250, 238, 0.96)',
};
const FONT = 'ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif';

/** Words that pop out when a puppet does its thing. */
const SAYS: Partial<Record<PuppetId, string>> = { duck: 'Quack!', dog: 'Woof!' };

/** One hand, or the two hands of a two-handed puppet, with what its puppet is doing. */
interface Group {
  key: number;
  /** For two hands, the one further left in the picture first. */
  hands: StageHand[];
  state: PerformerView;
}

type View = ReturnType<Wall['view']>;

interface Said {
  text: string;
  x: number;
  y: number;
  born: number;
}

export class Wall {
  private ctx: CanvasRenderingContext2D;
  private layer = document.createElement('canvas');
  private layerCtx: CanvasRenderingContext2D;
  private background?: HTMLCanvasElement;
  private width = 0;
  private height = 0;
  private lastAction = new Map<number, number>();
  private said: Said[] = [];
  private puffs: { x: number; y: number; size: number; born: number }[] = [];
  /** Each puppet's card picture, drawn once. */
  private cardPictures = new Map<PuppetId, HTMLCanvasElement>();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.layerCtx = this.layer.getContext('2d')!;
  }

  /**
   * Draws one frame. `demo` is a second stage playing the demonstration, drawn while nobody is there.
   * `aspect` is the camera picture's width over height. `time` is in seconds.
   */
  draw(stage: Stage, demo: Stage | undefined, aspect: number, time: number, problem = ''): void {
    this.resize();
    const { ctx, width: W, height: H } = this;
    ctx.drawImage(this.background!, 0, 0);

    const strip = this.stripHeight();
    const view = this.view(aspect, W, H - strip * 0.5);
    const showing = stage.waiting && demo ? demo : stage;
    const fade = stage.waiting && demo ? 0.75 : 1;
    for (const group of this.groups(showing)) this.drawShadow(group, view, time, fade);
    if (!stage.waiting) for (const group of this.groups(stage)) this.drawHint(group, view);
    this.drawSaid(time);
    this.drawPuffs(time);

    this.drawCards(stage, strip, time);
    if (stage.waiting) this.drawInvitation(time);
    if (problem) this.drawProblem(problem);
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const W = Math.round(this.canvas.clientWidth * ratio);
    const H = Math.round(this.canvas.clientHeight * ratio);
    if (W === this.width && H === this.height) return;
    [this.canvas.width, this.canvas.height] = [W, H];
    [this.layer.width, this.layer.height] = [W, H];
    [this.width, this.height] = [W, H];
    this.background = this.paintBackground(W, H);
  }

  private stripHeight(): number {
    return Math.min(this.height * 0.2, this.width * 0.16);
  }

  /** A warm pool of lamp light on a dark wall, with a faint plaster grain. */
  private paintBackground(W: number, H: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [W, H];
    const ctx = canvas.getContext('2d')!;
    const glow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.hypot(W, H) * 0.62);
    glow.addColorStop(0, COLOURS.lamp);
    glow.addColorStop(0.45, '#e2b57e');
    glow.addColorStop(0.8, '#8a5a36');
    glow.addColorStop(1, COLOURS.wallEdge);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    // Plaster grain: drawing only, so ordinary randomness is fine here.
    const grain = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < grain.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      grain.data[i]! += n;
      grain.data[i + 1]! += n;
      grain.data[i + 2]! += n;
    }
    ctx.putImageData(grain, 0, 0);
    return canvas;
  }

  /**
   * Maps picture units to the screen: mirrored, so your hand moves the way you expect, and scaled to cover the
   * wall, since hands near a lamp cast large shadows.
   */
  private view(aspect: number, W: number, H: number) {
    const scale = Math.max(W / aspect, H);
    const offX = (W - aspect * scale) / 2;
    const offY = (H - scale) / 2;
    return {
      scale,
      at: (p: Landmark): Pt => ({ x: offX + (aspect - p.x) * scale, y: offY + p.y * scale }),
    };
  }

  /** One hand, or the two hands of a two-handed puppet, each with what its puppet is doing. */
  private groups(stage: Stage): Group[] {
    const groups: Group[] = [];
    const hands = new Map(stage.hands.map((h) => [h.id, h]));
    for (const pair of stage.pairs) {
      const both = pair.ids.map((id) => hands.get(id)).filter((h): h is StageHand => !!h);
      if (both.length === 2) groups.push({ key: both[0]!.id * 1000 + both[1]!.id, hands: both, state: pair });
    }
    for (const hand of stage.hands) if (hand.pairedWith === undefined) groups.push({ key: hand.id, hands: [hand], state: hand });
    return groups;
  }

  private drawShadow(group: Group, view: View, time: number, fade: number): void {
    const { layerCtx: lc, ctx } = this;
    const { state } = group;
    // The hands are drawn solid on their own layer, then laid on the wall softened, so overlaps do not darken.
    lc.clearRect(0, 0, this.width, this.height);
    lc.fillStyle = COLOURS.shadow;
    const puppet = state.alive ? PUPPETS.find((p) => p.id === state.alive) : undefined;
    // A live walker is a little person: its arm goes and it grows a head, so the back of the hand is its body.
    const person = puppet?.id === 'walker';
    let palm = 0;
    for (const hand of group.hands) {
      const size = palmLength(hand.points) * view.scale;
      palm = Math.max(palm, size);
      const points = hand.points.map(view.at);
      fillHand(lc, points, size, 0, !person);
      if (person) this.head(lc, points, size, state.aliveFor);
    }
    if (puppet) this.cutEyes(lc, puppet, group, view, time, palm);
    // Leaves are part of the shadow, so they are drawn on the same layer.
    if (puppet?.id === 'tree') this.leaves(lc, group, view, palm, time);

    ctx.save();
    ctx.globalAlpha = 0.9 * Math.min(...group.hands.map((h) => h.presence)) * fade;
    ctx.filter = `blur(${Math.max(2, palm * 0.035)}px)`;
    ctx.drawImage(this.layer, 0, 0);
    ctx.restore();

    if (!puppet) return;
    if (puppet.id === 'butterfly') this.feelers(group, view, palm, time);
    if (puppet.id === 'candle') this.flame(group, view, palm, time);
    if (puppet.id === 'heart') this.glow(group, view, palm, time);
    if (puppet.id === 'walker') this.steps(group, view, palm, time);
    this.celebrate(group, view, palm);
    if (SAYS[puppet.id]) this.listen(group, view, SAYS[puppet.id]!, time);
  }

  /** A round head on a short neck, above the walker's body, growing in as it comes alive. */
  private head(lc: CanvasRenderingContext2D, points: Pt[], palm: number, aliveFor: number): void {
    const wrist = points[0]!;
    const knuckle = points[9]!;
    const length = Math.hypot(wrist.x - knuckle.x, wrist.y - knuckle.y) || 1;
    const [ux, uy] = [(wrist.x - knuckle.x) / length, (wrist.y - knuckle.y) / length];
    const grow = Math.min(1, aliveFor / 0.4);
    const centre = { x: wrist.x + ux * palm * 0.6 * grow, y: wrist.y + uy * palm * 0.6 * grow };
    lc.save();
    lc.strokeStyle = lc.fillStyle = COLOURS.shadow;
    lc.lineWidth = palm * 0.28;
    lc.lineCap = 'round';
    lc.beginPath();
    lc.moveTo(wrist.x, wrist.y);
    lc.lineTo(centre.x, centre.y);
    lc.stroke();
    lc.beginPath();
    lc.arc(centre.x, centre.y, palm * 0.36 * grow, 0, Math.PI * 2);
    lc.fill();
    lc.restore();
  }

  /** A candle flame on the fingertip: it flickers, and lights the wall around it. */
  private flame(group: Group, view: View, palm: number, time: number): void {
    const hand = group.hands[0]!;
    const tip = view.at(hand.points[8]!);
    const below = view.at(hand.points[7]!);
    // Flames rise whichever way the finger leans, but start from its tip.
    const grow = Math.min(1, group.state.aliveFor / 0.5);
    const flicker = 1 + 0.08 * Math.sin(time * 23) + 0.05 * Math.sin(time * 37 + 1);
    const h = palm * 0.55 * grow * flicker;
    const w = palm * 0.17 * grow;
    const base = { x: tip.x + (tip.x - below.x) * 0.3, y: tip.y + (tip.y - below.y) * 0.3 - palm * 0.05 };
    const sway = Math.sin(time * 5.3) * palm * 0.03;
    const { ctx } = this;
    ctx.save();
    const light = ctx.createRadialGradient(base.x, base.y - h * 0.4, 0, base.x, base.y - h * 0.4, palm * 2.2);
    light.addColorStop(0, `rgba(255, 214, 120, ${0.45 * grow})`);
    light.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(base.x - palm * 2.2, base.y - h * 0.4 - palm * 2.2, palm * 4.4, palm * 4.4);
    const body = ctx.createLinearGradient(base.x, base.y, base.x, base.y - h);
    body.addColorStop(0, '#fff3c4');
    body.addColorStop(0.5, '#ffc04d');
    body.addColorStop(1, 'rgba(255, 120, 40, 0.6)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.bezierCurveTo(base.x - w, base.y - h * 0.15, base.x - w * 0.6 + sway, base.y - h * 0.7, base.x + sway, base.y - h);
    ctx.bezierCurveTo(base.x + w * 0.6 + sway, base.y - h * 0.7, base.x + w, base.y - h * 0.15, base.x, base.y);
    ctx.fill();
    ctx.restore();
  }

  /** Leaves gather round the fingertips, the tree's branches, and stir in the wind. */
  private leaves(lc: CanvasRenderingContext2D, group: Group, view: View, palm: number, time: number): void {
    const hand = group.hands[0]!;
    const grow = Math.min(1, group.state.aliveFor / 0.8);
    lc.save();
    lc.fillStyle = COLOURS.shadow;
    for (const [n, i] of [4, 8, 12, 16, 20].entries()) {
      const tip = view.at(hand.points[i]!);
      const joint = view.at(hand.points[i - 1]!);
      // A small cluster round each tip, placed the same way every frame so it does not jump about.
      for (let k = 0; k < 5; k++) {
        const angle = n * 1.9 + k * 1.26;
        const reach = palm * (0.12 + 0.07 * ((k * 7 + n * 3) % 4)) * grow;
        const stir = Math.sin(time * 2.1 + n + k) * palm * 0.02;
        const x = tip.x + (tip.x - joint.x) * 0.2 + Math.cos(angle) * reach + stir;
        const y = tip.y + (tip.y - joint.y) * 0.2 + Math.sin(angle) * reach;
        lc.beginPath();
        lc.ellipse(x, y, palm * 0.11 * grow, palm * 0.065 * grow, angle, 0, Math.PI * 2);
        lc.fill();
      }
    }
    lc.restore();
  }

  /** The inside of a heart glows warm and beats. */
  private glow(group: Group, view: View, palm: number, time: number): void {
    const points = group.hands.flatMap((h) => [h.points[4]!, h.points[8]!, h.points[5]!].map(view.at));
    const centre = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
    // Lub-dub: two quick swells about once a second.
    const phase = (time * 1.1) % 1;
    const thump = (at: number) => Math.exp(-(((phase - at) / 0.06) ** 2));
    const beat = 0.8 + 0.2 * Math.max(thump(0.1), 0.7 * thump(0.3));
    const r = palm * 0.9 * beat * Math.min(1, group.state.aliveFor / 0.5);
    const { ctx } = this;
    ctx.save();
    const light = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, r);
    light.addColorStop(0, 'rgba(255, 120, 110, 0.75)');
    light.addColorStop(0.6, 'rgba(255, 140, 110, 0.3)');
    light.addColorStop(1, 'rgba(255, 140, 110, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(centre.x - r, centre.y - r, r * 2, r * 2);
    ctx.restore();
  }

  /** A puff of dust under the walker's feet at each step. */
  private steps(group: Group, view: View, palm: number, time: number): void {
    const before = this.lastAction.get(group.key) ?? 0;
    this.lastAction.set(group.key, group.state.action);
    if (before < 0.6 && group.state.action >= 0.6) {
      const hand = group.hands[0]!;
      const feet = [hand.points[8]!, hand.points[12]!].map(view.at);
      const lower = feet[0]!.y > feet[1]!.y ? feet[0]! : feet[1]!;
      this.puffs.push({ x: lower.x, y: lower.y + palm * 0.08, size: palm, born: time });
    }
  }

  /** Eyes are holes in the shadow where the lamp shines through. They open as the puppet comes alive, and blink. */
  private cutEyes(lc: CanvasRenderingContext2D, puppet: Puppet, group: Group, view: View, time: number, palm: number): void {
    const opening = Math.min(1, group.state.aliveFor / 0.35);
    const blinkPhase = (time + group.key * 1.7) % 3.4;
    const blink = blinkPhase < 0.14 ? Math.abs(blinkPhase - 0.07) / 0.07 : 1;
    const eyes = puppetEyes(puppet, group.hands.map((h) => h.points));
    const r = palm * (eyes.length > 1 ? 0.06 : 0.075);
    lc.save();
    lc.globalCompositeOperation = 'destination-out';
    for (const eye of eyes.map(view.at)) {
      lc.beginPath();
      lc.ellipse(eye.x, eye.y, r * opening, Math.max(0.5, r * 0.8 * opening * blink), 0, 0, Math.PI * 2);
      lc.fill();
    }
    lc.restore();
  }

  /** A live butterfly grows two feelers from where the thumbs meet, waving gently. */
  private feelers(group: Group, view: View, palm: number, time: number): void {
    const [a, b] = group.hands.map((h) => view.at(h.points[4]!));
    if (!a || !b) return;
    const base = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const grow = Math.min(1, group.state.aliveFor / 0.6);
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = COLOURS.shadow;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(2, palm * 0.035);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const sway = Math.sin(time * 2.4 + side) * palm * 0.05;
      const tip = { x: base.x + side * palm * 0.35 * grow + sway, y: base.y - palm * 0.75 * grow };
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.quadraticCurveTo(base.x + side * palm * 0.05, base.y - palm * 0.5 * grow, tip.x, tip.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, palm * 0.05 * grow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** A ring of warm light that spreads out from the hands as the puppet comes alive. */
  private celebrate(group: Group, view: View, palm: number): void {
    const t = group.state.aliveFor;
    if (t > 1) return;
    const centres = group.hands.map((h) => view.at(h.points[9]!));
    const centre = { x: centres.reduce((s, c) => s + c.x, 0) / centres.length, y: centres.reduce((s, c) => s + c.y, 0) / centres.length };
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.strokeStyle = COLOURS.glow;
    ctx.lineWidth = palm * 0.08 * (1 - t);
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, palm * (0.8 * group.hands.length + t * 2.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Each time the beak or mouth opens wide, the puppet says something. */
  private listen(group: Group, view: View, text: string, time: number): void {
    const before = this.lastAction.get(group.key) ?? 0;
    this.lastAction.set(group.key, group.state.action);
    if (before < 0.6 && group.state.action >= 0.6) {
      const tip = view.at(group.hands[0]!.points[8]!);
      this.said.push({ text, x: tip.x, y: tip.y, born: time });
    }
  }

  private drawPuffs(time: number): void {
    const { ctx } = this;
    this.puffs = this.puffs.filter((p) => time - p.born < 0.8);
    ctx.save();
    ctx.fillStyle = COLOURS.shadow;
    for (const p of this.puffs) {
      const age = (time - p.born) / 0.8;
      ctx.globalAlpha = 0.35 * (1 - age);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(p.x + side * p.size * (0.08 + 0.25 * age), p.y - p.size * 0.05 * age, p.size * (0.04 + 0.06 * age), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawSaid(time: number): void {
    const { ctx } = this;
    this.said = this.said.filter((s) => time - s.born < 1.4);
    const size = Math.round(this.height * 0.055);
    for (const s of this.said) {
      const age = (time - s.born) / 1.4;
      ctx.save();
      ctx.globalAlpha = 1 - age * age;
      ctx.font = `800 ${size}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOURS.cardInk;
      ctx.fillText(s.text, s.x, s.y - size * (0.8 + age * 1.5));
      ctx.restore();
    }
  }

  private drawHint(group: Group, view: View): void {
    const hint = group.state.hint;
    if (!hint || group.hands.some((h) => h.presence < 1)) return;
    const points = group.hands.flatMap((h) => h.points.map(view.at));
    const top = points.reduce((a, b) => (b.y < a.y ? b : a));
    // Above the middle of the hands, level with the highest point.
    top.x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const { ctx } = this;
    const size = Math.round(Math.max(22, this.height * 0.038));
    ctx.save();
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(hint).width + size * 1.4;
    const h = size * 2;
    const x = Math.min(this.width - w - 16, Math.max(16, top.x - w / 2));
    const y = Math.max(16, top.y - h - size * 1.6);
    ctx.fillStyle = COLOURS.hint;
    ctx.shadowColor = 'rgba(40, 20, 0, 0.25)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLOURS.cardInk;
    ctx.textBaseline = 'middle';
    ctx.fillText(hint, x + size * 0.7, y + h / 2);
    ctx.restore();
  }

  private drawCards(stage: Stage, strip: number, time: number): void {
    const { ctx, width: W, height: H } = this;
    const gap = strip * 0.1;
    // As wide as suits the pictures, but narrower when there are many cards, so they all fit across the wall.
    const cardW = Math.min((strip - gap) * 1.55, (W * 0.96 - gap * (PUPPETS.length - 1)) / PUPPETS.length);
    const cardH = Math.min(strip - gap, cardW * 0.8);
    const total = PUPPETS.length * cardW + (PUPPETS.length - 1) * gap;
    let x = (W - total) / 2;
    const y = H - cardH - gap;
    const nearest = new Map<PuppetId, number>();
    for (const { state } of stage.waiting ? [] : this.groups(stage)) {
      if (state.nearest) nearest.set(state.nearest, Math.max(nearest.get(state.nearest) ?? 0, state.score));
      if (state.alive) nearest.set(state.alive, 1);
    }
    for (const puppet of PUPPETS) {
      const closeness = nearest.get(puppet.id) ?? 0;
      const suggested = !stage.waiting && stage.suggestion === puppet.id && closeness === 0;
      const lift = closeness * cardH * 0.12 + (suggested ? Math.sin(time * 2.5) * cardH * 0.02 : 0);
      ctx.save();
      ctx.translate(x, y - lift);
      ctx.fillStyle = COLOURS.card;
      ctx.shadowColor = closeness > 0 ? COLOURS.glow : 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = closeness > 0 ? 10 + closeness * 30 : 8;
      ctx.beginPath();
      ctx.roundRect(0, 0, cardW, cardH, cardH * 0.12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.drawImage(this.cardPicture(puppet, cardW, cardH * 0.78), 0, 0);
      ctx.fillStyle = COLOURS.cardInk;
      ctx.font = `700 ${Math.round(Math.min(cardH * 0.15, cardW * 0.12))}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(puppet.name, cardW / 2, cardH * 0.88);
      if (closeness > 0 && closeness < 1) {
        // How close you are: a bar that fills as the shape gets nearer.
        ctx.fillStyle = 'rgba(59, 38, 24, 0.15)';
        ctx.fillRect(cardW * 0.15, cardH * 0.965, cardW * 0.7, cardH * 0.02);
        ctx.fillStyle = COLOURS.glow;
        ctx.fillRect(cardW * 0.15, cardH * 0.965, cardW * 0.7 * closeness, cardH * 0.02);
      }
      if (stage.made.has(puppet.id)) this.star(cardW - cardH * 0.13, cardH * 0.14, cardH * 0.1);
      ctx.restore();
      x += cardW + gap;
    }
  }

  /** A card picture: how to hold your hand on the left, and the shadow it makes on the right. */
  private cardPicture(puppet: Puppet, w: number, h: number): HTMLCanvasElement {
    const cached = this.cardPictures.get(puppet.id);
    if (cached && cached.width === Math.round(w)) return cached;
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = [Math.round(w), Math.round(h)];
    const ctx = canvas.getContext('2d')!;
    const hands = puppetHands(puppet, 0.4);
    const palm = palmLength(hands[0]!);
    // Fit the hands, without their forearms, into each half of the card.
    const all = hands.flat();
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const half = w / 2;
    const fit = Math.min((half * 0.8) / (maxX - minX + 0.4 * palm), (h * 0.72) / (maxY - minY + 0.4 * palm));
    // Mirrored, like the wall.
    const at = (cx: number) => (p: Landmark): Pt => ({ x: cx - (p.x - (minX + maxX) / 2) * fit, y: h * 0.55 + (p.y - (minY + maxY) / 2) * fit });

    for (const points of hands) {
      const hand = points.map(at(half * 0.52));
      ctx.fillStyle = COLOURS.cardInk;
      fillHand(ctx, hand, palm * fit, 2, false);
      ctx.fillStyle = COLOURS.skin;
      fillHand(ctx, hand, palm * fit, 0, false);
    }
    ctx.fillStyle = COLOURS.shadow;
    for (const points of hands) fillHand(ctx, points.map(at(half * 1.48)), palm * fit, 0, false);
    ctx.fillStyle = COLOURS.eye;
    for (const eye of puppetEyes(puppet, hands).map(at(half * 1.48))) {
      ctx.beginPath();
      ctx.ellipse(eye.x, eye.y, palm * fit * 0.075, palm * fit * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // An arrow from the hand to its shadow.
    ctx.strokeStyle = 'rgba(59, 38, 24, 0.35)';
    ctx.lineWidth = Math.max(2, h * 0.02);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(half * 0.94, h * 0.55);
    ctx.lineTo(half * 1.06, h * 0.55);
    ctx.moveTo(half * 1.02, h * 0.5);
    ctx.lineTo(half * 1.06, h * 0.55);
    ctx.lineTo(half * 1.02, h * 0.6);
    ctx.stroke();
    this.cardPictures.set(puppet.id, canvas);
    return canvas;
  }

  private star(x: number, y: number, r: number): void {
    const { ctx } = this;
    ctx.fillStyle = COLOURS.glow;
    ctx.strokeStyle = COLOURS.cardInk;
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawInvitation(time: number): void {
    const { ctx, width: W, height: H } = this;
    const size = Math.round(Math.min(W * 0.05, H * 0.075));
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(time * 1.8);
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.cardInk;
    ctx.fillText('Hold up a hand in the light', W / 2, H * 0.12);
    ctx.restore();
  }

  /** For whoever looks after the installation: small, in a corner. */
  private drawProblem(problem: string): void {
    const { ctx, width: W, height: H } = this;
    ctx.save();
    ctx.font = `500 ${Math.round(H * 0.018)}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 240, 220, 0.6)';
    ctx.fillText(problem, W - 12, H * 0.025);
    ctx.restore();
  }
}
