# Architecture

How the code is arranged, and why. Matches stage 1; update it as the code changes.

## The pieces

```
camera ──► hand points ──► Stage (the core) ──► what to draw ──► canvas
             ▲
model hand ──┘ (demo mode, the waiting-screen demo, and tests)
```

- **`src/core/`** is "the core" in the shared rules: no DOM, no browser APIs, no real clock, no `Math.random`. The same hand points and times always give the same result.
  - `hand.ts`: the 21-point layout and small geometry helpers. A **landmark** is one of the 21 points MediaPipe finds on a hand: the wrist, and four points up each finger and the thumb.
  - `handModel.ts`: the model hand. A **pose** (how much each finger bends, where the thumb goes, which way the hand points and how big it is) becomes 21 points. It knows nothing about puppets.
  - `describe.ts`: turns 21 points into a description of the pose that is the same wherever the hand is, however big, and for a left or a right hand.
  - `puppets.ts`: each puppet's checks and hints, its model-hand pose, where its eye goes, and what it does once made.
  - `recognise.ts`: scores a description against a puppet and picks the hint.
  - `stage.ts`: follows hands from frame to frame, smooths their scores, decides when a puppet has been held long enough to come alive, which hint to show and for how long, which puppets have been made this visit, and whether anybody is there.
  - `demo.ts`: the demonstration choreography: model-hand poses over time, moving from one puppet to the next.
- **`src/input/`** is the camera adapter, copied from the aquarium. It turns MediaPipe's output into hand points in **picture units**: 0 to 1 down the picture, and the same scale across, so a square in the world is a square in the numbers (MediaPipe's own x and y are not the same scale unless the picture is square). It never touches the page.
- **`src/render/`** draws the wall: the lamp light, the shadows, the eyes, the cards and hints. It only reads the stage.
- **`src/main.ts`** wires them together and runs the frame loop.

## Rules

- Recognition takes hand points, never the camera ([decision 2](decisions.md#2-recognition-is-separate-from-the-camera)).
- The camera picture is never drawn or kept ([decision 7](decisions.md#7-the-camera-picture-is-never-shown-or-kept)).
- Times are seconds, passed in.
- Points are in picture units as the camera sees them, not mirrored. The renderer mirrors, so that moving your hand right moves its shadow right.
