// Wires the camera (or the demonstration) to the stage, and the stage to the wall, and runs the frame loop.
//   ?demo         the demonstration plays as if it were a visitor, with no camera
//   ?demo=rabbit  one puppet held still (also duck, dog, open), for screenshots
import './style.css';
import { demoHands, stillHands } from './core/demo';
import type { Landmark } from './core/hand';
import { Stage } from './core/stage';
import { HandCamera } from './input/camera';
import { Wall } from './render/wall';

const canvas = document.querySelector<HTMLCanvasElement>('#wall')!;
const wall = new Wall(canvas);
const stage = new Stage();
/** A second stage that watches the demonstration, so the demo hand comes alive just as a visitor's would. */
const demo = new Stage();
const seconds = () => performance.now() / 1000;

const params = new URLSearchParams(location.search);
const demoParam = params.get('demo');
const still = demoParam ? stillHands(demoParam) : undefined;
let camera: HandCamera | undefined;

if (demoParam === null) {
  camera = new HandCamera((hands, time) => stage.update(hands, time), seconds);
  void camera.start();
}

function frame(): void {
  const time = seconds();
  if (still) stage.update(still, time);
  else if (demoParam !== null) stage.update(demoHands(time), time);
  else demo.update(stage.waiting ? demoHands(time) : [], time);
  wall.draw(stage, demoParam === null ? demo : undefined, camera?.aspect ?? 4 / 3, time, camera?.problem);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Full screen on a double click, for setting up; galleries usually start the browser in kiosk mode instead.
canvas.addEventListener('dblclick', () => void document.documentElement.requestFullscreen?.());

// Development only: R saves the hand points the camera sees now, as a test example. Never pictures (decision 7).
if (import.meta.env.DEV) {
  addEventListener('keydown', (event) => {
    if (event.key !== 'r' || !camera) return;
    save(camera.latest);
  });
}

function save(hands: Landmark[][]): void {
  const blob = new Blob([JSON.stringify({ aspect: camera?.aspect, hands }, null, 1)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hands-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
