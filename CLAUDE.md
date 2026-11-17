# Shadowplay

Shadowplay is the working name. Teaches hand shadow puppets: the camera recognises the shape your hands are making and helps you get it right. Nothing is built yet and the stack is not chosen. Read [docs/vision.md](docs/vision.md) and [docs/open-questions.md](docs/open-questions.md) before planning or building anything.

How we work, git, writing and subagent rules are shared by all the projects and live in [../CLAUDE.md](../CLAUDE.md). This file adds what is specific to Shadowplay.

## Rules that already hold

- **Recognition is tested without a camera.** Whatever decides "this is a rabbit" takes recorded hand positions or pictures as input, never the live camera, so it can be tested on saved examples. The live camera is an adapter in front of it, as in the aquarium's `src/input/`.
- **Feedback is kind.** It says what to change ("lift your thumb"), not just "wrong". A puppet that is nearly right counts.
- **The aquarium already does hand tracking.** Its MediaPipe set-up (`../aquarium/src/input/`, `../aquarium/scripts/copy-mediapipe.mjs`) is the starting point; copy what is needed rather than rebuilding it.

## Commands

None yet: they arrive with the stack.
