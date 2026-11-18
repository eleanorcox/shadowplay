// Draws a hand as a solid shape from its 21 points: a forearm, a padded palm and rounded fingers. Used for the
// shadows on the wall and the hands on the cards. It fills with whatever colour the caller has set.
import { BONES, dist, type Landmark } from '../core/hand';

export interface Pt {
  x: number;
  y: number;
}

/** Each bone's thickness in palm lengths: thumb, then each finger from knuckle to tip. */
// Wide enough that fingers held together merge into one shape, as they do in a real shadow.
const WIDTH: Record<string, number> = {
  '1-2': 0.28, '2-3': 0.24, '3-4': 0.21,
  '5-6': 0.24, '6-7': 0.22, '7-8': 0.2,
  '9-10': 0.25, '10-11': 0.23, '11-12': 0.21,
  '13-14': 0.24, '14-15': 0.22, '15-16': 0.2,
  '17-18': 0.21, '18-19': 0.19, '19-20': 0.17,
};
const PALM_OUTLINE = [0, 1, 2, 5, 9, 13, 17];

/**
 * `points` are already on screen; `palm` is the palm's real length on screen (from the 3D points, so a hand
 * seen edge-on is not drawn thin). `grow` thickens everything by that many pixels, for outlines.
 */
export function fillHand(ctx: CanvasRenderingContext2D, points: readonly Pt[], palm: number, grow = 0, arm = true): void {
  const at = (i: number) => points[i]!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle;

  if (arm) {
    // The forearm carries on from the wrist, away from the fingers, well off the edge.
    const dx = at(0).x - at(9).x;
    const dy = at(0).y - at(9).y;
    const length = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / length, dy / length];
    const [px, py] = [-uy, ux];
    const start = { x: at(0).x - ux * palm * 0.25, y: at(0).y - uy * palm * 0.25 };
    const end = { x: at(0).x + ux * palm * 8, y: at(0).y + uy * palm * 8 };
    // As wide as the hand looks across its knuckles, so a hand seen edge-on has a slim arm too.
    const across = Math.hypot(at(5).x - at(17).x, at(5).y - at(17).y);
    const half = Math.max(palm * 0.16, across * 0.5);
    const [w0, w1] = [half + grow, half * 1.3 + grow];
    ctx.beginPath();
    ctx.moveTo(start.x + px * w0, start.y + py * w0);
    ctx.lineTo(end.x + px * w1, end.y + py * w1);
    ctx.lineTo(end.x - px * w1, end.y - py * w1);
    ctx.lineTo(start.x - px * w0, start.y - py * w0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.beginPath();
  PALM_OUTLINE.forEach((i, n) => (n === 0 ? ctx.moveTo(at(i).x, at(i).y) : ctx.lineTo(at(i).x, at(i).y)));
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = palm * 0.22 + grow * 2;
  ctx.stroke();

  for (const [a, b] of BONES) {
    const width = WIDTH[`${a}-${b}`];
    if (!width) continue;
    ctx.lineWidth = palm * width + grow * 2;
    ctx.beginPath();
    ctx.moveTo(at(a).x, at(a).y);
    ctx.lineTo(at(b).x, at(b).y);
    ctx.stroke();
  }
}

/** The palm's true length in picture units, wrist to middle knuckle, whichever way the hand is turned. */
export const palmLength = (points: readonly Landmark[]) => dist(points[0]!, points[9]!);
