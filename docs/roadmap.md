# Roadmap

A proposed order of work. Details are loose on purpose: where the docs pick something specific, it is a starting point to react to.

## Where things stand

As of 18 November 2026:

| Stage | Status |
| --- | --- |
| 1, a rabbit on the wall | Done; recorded as v1 |
| 2, the installation loop | Software mostly built ahead of plan; needs real hands, children and kiosk set-up |
| 3, puppets that come alive | Not started |
| 4, two-handed puppets | Bird and butterfly built ahead of order; not yet tried with real hands |
| 5, real shadows with a projector | Needs a projector |

Facts that shape the order:

- It is a gallery or museum installation for all ages ([decision 3](decisions.md#3-a-gallery-installation-for-all-ages)).
- Hardware is one laptop with a built-in webcam. Build first, buy second.
- No exhibition or date yet.

## The reasoning

- Get to something you can hold a hand up to as early as possible.
- Recognition is the risky part, so it comes first and is tested on examples without a camera.
- Everything that must survive a day in a gallery (no menu, nobody to restart it, people arriving and leaving) arrives in stage 2, before more puppets, so every later puppet is built inside the real loop.

## Stages

### Stage 1: a rabbit on the wall

*Status, 18 November 2026: built and tested on model-hand examples, screenshots taken ([screenshots](screenshots/README.md)), tried by Eleanor with a webcam and recorded as v1. There are no recordings of real hand points yet, so the thresholds are still unchecked.*

The screen is a lamp-lit wall. Your hand's shadow falls on it. Make the rabbit and it comes alive: an eye opens and blinks.

- **Shows:** whether recognising a puppet from hand points works, and whether a shadow drawn from points looks enough like a shadow.
- **Decides:** whether to carry on with hand points or bring silhouettes forward.
- **Includes:** the project set-up; the model hand; describing a pose; the rabbit's checks and hints; a stage that tracks hands over time and decides when a puppet is held long enough to come alive; drawing shadows; the camera adapter copied from the aquarium; a demo mode with no camera (`?demo`) for trying it and for screenshots; a recorder that saves hand points as test examples.

### Stage 2: the installation loop

*Status, 18 November 2026: the duck, the dog, the cards with stars and a closeness bar, hints, the waiting-screen demonstration and the camera reconnecting were built alongside stage 1, since they were cheap once the core existed. Still to do: recordings of real hands as test examples, trying it with children, and kiosk set-up on the installation computer.*

The duck and the dog join the rabbit (and, since, the swan and the spider). Cards along the bottom show them all; the one you are nearest to lights up and says what to change. Nobody in view for a while, and the wall plays a demonstration and clears the stars.

- **Shows:** what a visitor with no instructions does.
- **Decides:** how forgiving recognition has to be, after trying it with children.
- **Includes:** kiosk running (full screen, no cursor, the camera reconnecting if it drops out); a sign about the camera; recordings of real hands as test examples.

### Stage 3: puppets that come alive

Each puppet has something to do once made, and a little scene: grass grows under the rabbit, the duck quacks as its beak opens, the dog barks. Sound, off by default, as galleries are often shared spaces.

### Stage 4: two-handed puppets

*Status, 18 November 2026: the bird and the butterfly are built, with hands paired by the stage ([decision 11](decisions.md#11-four-more-puppets-including-two-handed-ones)). Still to find out: whether the tracker keeps both hands when the thumbs are hooked.*

The bird and the butterfly (thumbs hooked together, fingers flapping), perhaps the deer. Hands are paired by how close they are.

### Stage 5: real shadows with a projector

A projector is the lamp; visitors cast real shadows on a wall; the camera watches. The projection adds to the shadows. Needs corner correction, as in the aquarium, and perhaps silhouettes beside hand points.

Later, from [ideas](ideas.md): a shadow theatre with a story, and making up your own puppet.
