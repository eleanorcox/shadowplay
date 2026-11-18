# Architecture

How the code is arranged, and why. Matches the code as of 18 November 2026; update it as the code changes.

## The pieces

```
camera ──► hand points ──► Stage (the core) ──► what to draw ──► canvas
             ▲
model hand ──┘ (demo mode, the waiting-screen demo, and tests)
```

- **`src/core/`** is "the core" in the shared rules: no DOM, no browser APIs, no real clock, no `Math.random`. The same hand points and times always give the same result.
  - `hand.ts`: the 21-point layout and small geometry helpers. A **landmark** is one of the 21 points MediaPipe finds on a hand: the wrist, and four points up each finger and the thumb.
  - `handModel.ts`: the model hand. A **pose** (how much each finger bends, where the thumb goes, which way the hand points and how big it is) becomes 21 points. It knows nothing about puppets.
  - `describe.ts`: turns 21 points into a description of the pose that is the same wherever the hand is, however big, and for a left or a right hand; and two hands into a pair description (each hand, and how close the thumbs are).
  - `puppets.ts`: each puppet's checks and hints, its model-hand pose (two poses for a two-handed puppet), where its eyes go, and what it does once made.
  - `recognise.ts`: scores a description against a puppet, or a pair description against a two-handed puppet, and picks the hint.
  - `performer.ts`: one hand, or a pair of hands, over time: smooths its scores, decides when a puppet has been held long enough to come alive and when it ends, and which hint to show for how long.
  - `stage.ts`: follows hands from frame to frame, gives each a performer, scores every pair of hands against the two-handed puppets and lets a pair claim its hands when it is the better match, and keeps track of which puppets have been made this visit and whether anybody is there.
  - `demo.ts`: the demonstration choreography: model-hand poses over time, moving from one puppet to the next.
- **`src/input/`** is the camera adapter, copied from the aquarium. It turns MediaPipe's output into hand points in **picture units**: 0 to 1 down the picture, and the same scale across, so a square in the world is a square in the numbers (MediaPipe's own x and y are not the same scale unless the picture is square). It never touches the page.
- **`src/render/`** draws the wall. It only reads the stage.
  - `handShape.ts`: a hand as a solid shape from its 21 points (forearm, padded palm, rounded fingers), used for the shadows and the cards.
  - `wall.ts`: the lamp light, each hand's shadow (drawn solid, then laid on softened so overlaps do not darken), the eye of a live puppet (a hole in the shadow that opens and blinks), the words a duck or dog says, hints, the cards and the invitation.
- **`src/main.ts`** wires them together and runs the frame loop. While nobody is there, a second stage watches the demonstration, so the demo hand comes alive exactly as a visitor's would.

## Rules

- Recognition takes hand points, never the camera ([decision 2](decisions.md#2-recognition-is-separate-from-the-camera)).
- The camera picture is never drawn or kept ([decision 7](decisions.md#7-the-camera-picture-is-never-shown-or-kept)).
- Times are seconds, passed in.
- Points are in picture units as the camera sees them, not mirrored. The renderer mirrors, so that moving your hand right moves its shadow right.
