# Shadowplay

Shadowplay is the working name. Teaches hand shadow puppets as a gallery installation for all ages: a lamp-lit wall shows the shadows of your hands, recognises the puppet you are making, says what to change, and brings it to life. TypeScript, Vite, Vitest, MediaPipe. The plan lives in [docs/](docs/README.md); read [docs/roadmap.md](docs/roadmap.md) and [docs/architecture.md](docs/architecture.md) before planning or building anything.

How we work, git, writing and subagent rules are shared by all the projects and live in [../CLAUDE.md](../CLAUDE.md). This file adds what is specific to Shadowplay.

## Commands

```sh
nvm use            # Node 24, pinned in .nvmrc
npm install        # also copies the hand-tracking runtime into public/mediapipe/wasm
npm run dev        # local server; open / for the camera, /?demo for the demonstration, /?demo=rabbit for a still scene
npm test           # all tests, once
npm run typecheck  # type check only
npm run build      # type check, then build into dist/
```

Run `npm test` and `npm run typecheck` before calling anything done. [docs/testing.md](docs/testing.md) lists the first tests for each stage.

## Code rules

- `src/core/` is "the core" in the shared rules: no DOM, no browser APIs, no real clock, no `Math.random`.
- **Recognition is tested without a camera.** It takes hand points, never the live camera. `src/input/` is the camera adapter and never touches the page.
- **The camera picture is never drawn, saved or sent** ([decision 7](docs/decisions.md#7-the-camera-picture-is-never-shown-or-kept)). Only hand points leave the adapter.
- **Feedback is kind.** A hint says what to change ("Lift your thumb up for an ear"), never just "wrong". A puppet counts at 0.8, not 1.
- A new puppet is an entry in `src/core/puppets.ts` (checks, hints, a model-hand pose, its eyes), added to `ONE_HANDED` or `TWO_HANDED`. The tests in `recognise.test.ts` then check it is recognised as itself and nothing else, for either hand; the list of puppets in that file must be updated too. Check the near misses as well: anything above about 0.75 for the wrong puppet is too close.
- `src/render/` only reads the stage.
- Words on screen are short; pictures carry the meaning, as many visitors cannot read yet.
