// Draws the wall: lamp light, the shadows of the hands, the eyes of puppets that have come alive, hints, and the
// puppet cards along the bottom. It only reads the stage.
import { mix, type Landmark } from '../core/hand';
import { PUPPETS, type Puppet, type PuppetId } from '../core/puppets';
import type { Stage, StageHand } from '../core/stage';
import { modelHand } from '../core/handModel';
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
    for (const hand of showing.hands) this.drawShadow(hand, view, time, fade);
    if (!stage.waiting) for (const hand of stage.hands) this.drawHint(hand, view);
    this.drawSaid(time);

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

  private drawShadow(hand: StageHand, view: ReturnType<Wall['view']>, time: number, fade: number): void {
    const points = hand.points.map(view.at);
    const palm = palmLength(hand.points) * view.scale;
    const { layerCtx: lc, ctx } = this;

    // Each hand is drawn solid on its own layer, then laid on the wall softened, so overlaps do not darken.
    lc.clearRect(0, 0, this.width, this.height);
    lc.fillStyle = COLOURS.shadow;
    fillHand(lc, points, palm);
    const puppet = hand.alive ? PUPPETS.find((p) => p.id === hand.alive) : undefined;
    if (puppet) this.cutEye(lc, puppet, hand, view, time, palm);

    ctx.save();
    ctx.globalAlpha = 0.9 * hand.presence * fade;
    ctx.filter = `blur(${Math.max(2, palm * 0.035)}px)`;
    ctx.drawImage(this.layer, 0, 0);
    ctx.restore();

    if (puppet) this.celebrate(hand, points, palm);
    if (puppet && SAYS[puppet.id]) this.listen(hand, points, SAYS[puppet.id]!, time);
  }

  /** The eye is a hole in the shadow where the lamp shines through. It opens as the puppet comes alive, and blinks. */
  private cutEye(lc: CanvasRenderingContext2D, puppet: Puppet, hand: StageHand, view: ReturnType<Wall['view']>, time: number, palm: number): void {
    const eye = view.at(mix(hand.points, puppet.eye));
    const opening = Math.min(1, hand.aliveFor / 0.35);
    const blinkPhase = (time + hand.id * 1.7) % 3.4;
    const blink = blinkPhase < 0.14 ? Math.abs(blinkPhase - 0.07) / 0.07 : 1;
    const r = palm * 0.075;
    lc.save();
    lc.globalCompositeOperation = 'destination-out';
    lc.beginPath();
    lc.ellipse(eye.x, eye.y, r * opening, Math.max(0.5, r * 0.8 * opening * blink), 0, 0, Math.PI * 2);
    lc.fill();
    lc.restore();
  }

  /** A ring of warm light that spreads out from the hand as the puppet comes alive. */
  private celebrate(hand: StageHand, points: Pt[], palm: number): void {
    const t = hand.aliveFor;
    if (t > 1) return;
    const centre = points[9]!;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.strokeStyle = COLOURS.glow;
    ctx.lineWidth = palm * 0.08 * (1 - t);
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, palm * (0.8 + t * 2.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Each time the beak or mouth opens wide, the puppet says something. */
  private listen(hand: StageHand, points: Pt[], text: string, time: number): void {
    const before = this.lastAction.get(hand.id) ?? 0;
    this.lastAction.set(hand.id, hand.action);
    if (before < 0.6 && hand.action >= 0.6) {
      const tip = points[8]!;
      this.said.push({ text, x: tip.x, y: tip.y, born: time });
    }
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

  private drawHint(hand: StageHand, view: ReturnType<Wall['view']>): void {
    if (!hand.hint || hand.presence < 1) return;
    const points = hand.points.map(view.at);
    const top = points.reduce((a, b) => (b.y < a.y ? b : a));
    const { ctx } = this;
    const size = Math.round(Math.max(22, this.height * 0.038));
    ctx.save();
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(hand.hint).width + size * 1.4;
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
    ctx.fillText(hand.hint, x + size * 0.7, y + h / 2);
    ctx.restore();
  }

  private drawCards(stage: Stage, strip: number, time: number): void {
    const { ctx, width: W, height: H } = this;
    const gap = strip * 0.12;
    const cardH = strip - gap;
    const cardW = cardH * 1.55;
    const total = PUPPETS.length * cardW + (PUPPETS.length - 1) * gap;
    let x = (W - total) / 2;
    const y = H - strip;
    const nearest = new Map<PuppetId, number>();
    for (const hand of stage.waiting ? [] : stage.hands) {
      if (hand.nearest) nearest.set(hand.nearest, Math.max(nearest.get(hand.nearest) ?? 0, hand.score));
      if (hand.alive) nearest.set(hand.alive, 1);
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
      ctx.font = `700 ${Math.round(cardH * 0.15)}px ${FONT}`;
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
    const points = modelHand({ ...puppet.pose(0.4), x: 0, y: 0, size: 1 });
    // Fit the hand, without its forearm, into each half of the card.
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const half = w / 2;
    const fit = Math.min((half * 0.62) / (maxX - minX + 0.4), (h * 0.7) / (maxY - minY + 0.4));
    const place = (cx: number) =>
      points.map((p) => ({ x: cx + (-(p.x - (minX + maxX) / 2)) * fit, y: h * 0.55 + (p.y - (minY + maxY) / 2) * fit }));

    const hand = place(half * 0.55);
    ctx.fillStyle = COLOURS.cardInk;
    fillHand(ctx, hand, fit, 2, false);
    ctx.fillStyle = COLOURS.skin;
    fillHand(ctx, hand, fit, 0, false);

    const shadow = place(half * 1.45);
    ctx.fillStyle = COLOURS.shadow;
    fillHand(ctx, shadow, fit, 0, false);
    const eye = mix(points, puppet.eye);
    const e = { x: half * 1.45 - (eye.x - (minX + maxX) / 2) * fit, y: h * 0.55 + (eye.y - (minY + maxY) / 2) * fit };
    ctx.fillStyle = COLOURS.eye;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, fit * 0.075, fit * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

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
