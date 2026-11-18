// Webcam hand tracking, adapted from the aquarium: starts the camera, runs the hand-tracking model on each new
// camera frame, and passes the hands it finds on in picture units. The model and its runtime are served from
// this project (public/mediapipe), so it works with no internet connection. The camera picture itself goes only
// to the model: it is never drawn, saved or sent anywhere (decision 7).
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { Landmark } from '../core/hand';

const fromProject = (path: string) => new URL(path, document.baseURI).href;

/** Seconds between attempts to get the camera back after it fails or is unplugged. */
const RETRY = 3;

/**
 * MediaPipe's x and y are fractions of the picture's width and height. Picture units scale x by the picture's
 * shape, so that across and down are measured the same way and a square hand stays square.
 */
export function toPictureUnits(hands: NormalizedLandmark[][], aspect: number): Landmark[][] {
  return hands.map((points) => points.map((p) => ({ x: p.x * aspect, y: p.y, z: p.z * aspect })));
}

export class HandCamera {
  /** What is wrong, if anything, in words for whoever looks after the installation. Empty when all is well. */
  problem = 'Starting the camera…';
  /** Width over height of the camera picture. */
  aspect = 4 / 3;
  /** The hands in the latest frame, for the recorder. */
  latest: Landmark[][] = [];
  private video = document.createElement('video');
  private landmarker?: HandLandmarker;
  private delegate: 'GPU' | 'CPU' = 'GPU';
  private runtime?: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
  private stream?: MediaStream;
  private running = false;
  private lastFrame = -1;

  constructor(
    private onHands: (hands: Landmark[][], time: number) => void,
    private seconds: () => number,
  ) {
    this.video.muted = true;
    this.video.playsInline = true;
  }

  /** Starts the camera, and keeps trying until it works; a gallery has nobody to press a button. */
  async start(): Promise<void> {
    try {
      this.landmarker ??= await this.loadModel();
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      for (const track of this.stream.getVideoTracks()) track.addEventListener('ended', () => this.restart('The camera stopped'));
      this.video.srcObject = this.stream;
      await this.video.play();
      this.problem = '';
      this.running = true;
      requestAnimationFrame(this.track);
    } catch (error) {
      this.restart(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    }
  }

  private restart(why: string): void {
    console.warn('Camera problem; trying again shortly.', why);
    this.problem = `${why}. Trying again…`;
    this.running = false;
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = undefined;
    this.onHands([], this.seconds());
    setTimeout(() => void this.start(), RETRY * 1000);
  }

  private async loadModel(delegate: 'GPU' | 'CPU' = this.delegate): Promise<HandLandmarker> {
    this.runtime ??= await FilesetResolver.forVisionTasks(fromProject('mediapipe/wasm'));
    const options = (use: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: fromProject('mediapipe/hand_landmarker.task'), delegate: use },
      runningMode: 'VIDEO' as const,
      // Two people with two hands each.
      numHands: 4,
    });
    // The graphics card is much faster, but not every browser offers it to the model.
    if (delegate === 'GPU') {
      try {
        return await HandLandmarker.createFromOptions(this.runtime, options('GPU'));
      } catch (error) {
        console.warn('Hand tracking could not use the graphics card; using the processor instead.', error);
      }
    }
    this.delegate = 'CPU';
    return await HandLandmarker.createFromOptions(this.runtime, options('CPU'));
  }

  private track = (): void => {
    if (!this.running || !this.landmarker) return;
    // Only look again when the camera has delivered a new picture with a size.
    if (this.video.currentTime !== this.lastFrame && this.video.videoWidth > 0) {
      this.lastFrame = this.video.currentTime;
      this.aspect = this.video.videoWidth / this.video.videoHeight;
      try {
        const result = this.landmarker.detectForVideo(this.video, performance.now());
        this.latest = toPictureUnits(result.landmarks, this.aspect);
        this.onHands(this.latest, this.seconds());
      } catch (error) {
        console.error('Hand tracking failed on a camera frame.', error);
        // If the graphics card was the problem, carry on with the processor.
        if (this.delegate === 'GPU') {
          this.delegate = 'CPU';
          const failed = this.landmarker;
          this.landmarker = undefined;
          failed.close();
          void this.loadModel('CPU').then((landmarker) => {
            this.landmarker = landmarker;
            requestAnimationFrame(this.track);
          });
          return;
        }
      }
    }
    requestAnimationFrame(this.track);
  };
}
