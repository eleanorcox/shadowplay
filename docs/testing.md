# Testing plan

We build this test-first: a failing test before every change in behaviour and every bug fix. This doc says what the tests cover, what they cannot, and which tests come first in each stage of the [roadmap](roadmap.md).

## What can and cannot be tested

| Kind of code | Example | How it is checked |
| --- | --- | --- |
| Maths on hand points | Finger bend, thumb touching a fingertip | Test-first, on model-hand poses |
| Recognition | This is a rabbit; this fist is nothing; the hint for a nearly-rabbit | Test-first, on model-hand poses now, on recorded real hands as they arrive |
| Behaviour over time | Held for long enough comes alive; nobody there clears the stars | Test-first, feeding the stage frames with made-up times |
| Drawing | Does the shadow look like a shadow? Is the eye in the right place? | By eye, with fixed scenes (below), and screenshots kept in `docs/screenshots/` |
| The camera and the real room | Lighting, distance, children's hands | Trying it, and recording hand points as new test examples |

## What exists today

- 54 tests in seven files, run with Vitest by `npm test`. They cover the model hand, describing a pose, recognising and hinting each puppet for either hand at several sizes, two-handed puppets (and that unrelated hands, or two dogs facing each other, are not one), pairing hands on the stage, the stage over time, the demonstration (a full loop makes every puppet, recognised by a real stage), the still scenes, and the camera adapter's units. `examples.test.ts` checks every recording in `src/core/examples/` against its file name.
- Nothing tests the drawing; it is checked with fixed scenes and [screenshots](screenshots/README.md).
- There are no recordings of real hands yet.

## Fixed scenes

`?demo` runs the wall with the model hand instead of the camera. `?demo=rabbit` (or `duck`, `dog`, `fist`) holds one pose still, so a screenshot is the same every time.

## Test examples from real hands

The model hand's poses are idealised; real hands are not. Press **R** while the camera is running (development only) to save the hand points currently seen as a JSON file; put good ones in `src/core/examples/` with a name saying what they are (`rabbit-eleanor-1.json`, `nearly-rabbit-thumb-loose.json`). Recognition tests run on every file there. Until there are recordings, especially of children's hands, the thresholds are unchecked.

## First tests for each stage

### Stage 1

- The model hand gives 21 points; a straight finger reads as straight and a folded one as folded.
- The description is the same for a hand moved, made bigger, or mirrored (a left hand).
- The rabbit pose is recognised as the rabbit; a fist and an open hand are not.
- A nearly-rabbit (thumb not touching) scores between, and its hint is about the thumb.
- A puppet held for less than the hold time does not come alive; held longer, it does; a brief tracking dropout does not end it.
- The same hand seen in successive frames keeps its identity.

### Stage 4

- Each two-handed pose is recognised as itself and not as the other, whichever order the hands are listed in.
- Two people's separate puppets are not a pair; a bird's hands are a bird, not two dogs.
- When the hands part, the pair ends and each hand is its own again.

### Stage 2

- Every puppet pose is recognised as itself and as nothing else.
- With nobody in view for long enough the stage is waiting and the stars are cleared.
- A hint stays for a minimum time and is not replaced while it is being acted on.
- Recorded real hands are recognised.
