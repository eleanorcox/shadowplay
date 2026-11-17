# Decision log

A record of the design decisions in this project: what was decided, when, what prompted it, and what it replaced. It exists so the reasoning can be found later, in particular when writing about the work.

## How this log works

- **One entry per decision**, numbered in the order they were made, newest at the bottom.
- **Entries are not rewritten.** When a decision changes, a new entry is added that says what changed and why, and the old entry's status becomes "Replaced by" with a link.
- **Add the entry when the decision is made**, in the same piece of work.
- **"What prompted it"** records the situation at the time, in gist, not word for word.
- **Record the alternatives**, including the ones that lost, and why.

Statuses: **Proposed**, **Decided**, **Built**, **Replaced by N**.

Template:

```markdown
## N. Title

- **Date:**
- **Status:**
- **What prompted it:**
- **Decision:**
- **Alternatives considered:**
- **What follows from it:**
```

## Index

| No. | Decision | Date | Status |
| --- | --- | --- | --- |
| [1](#1-working-name-shadowplay) | Working name: Shadowplay | 17 Nov 2026 | Decided |
| [2](#2-recognition-is-separate-from-the-camera) | Recognition is separate from the camera | 17 Nov 2026 | Proposed |

## 1. Working name: Shadowplay

- **Date:** 17 November 2026
- **Status:** Decided
- **What prompted it:** Setting up repositories for several new projects. The idea was something that teaches hand shadow puppets, using a camera to recognise hand gestures.
- **Decision:** Shadowplay, as a working name; the repository and folder are `shadowplay`.
- **Alternatives considered:** Ombromanie (the old French name for the art; distinctive but hard to spell), Hand Shadows (plain).
- **What follows from it:** None yet.

## 2. Recognition is separate from the camera

- **Date:** 17 November 2026
- **Status:** Proposed
- **What prompted it:** The aquarium's rule that input adapters never touch the page, which made its hand input testable.
- **Decision:** Recognising a puppet takes recorded hand points (or pictures) as input and returns a score and hints. The live camera is only an adapter that feeds it.
- **Alternatives considered:** Recognising straight from the live camera. Quicker to start, but impossible to test without someone holding up their hands.
- **What follows from it:** A small library of recorded hand positions, good and bad, is collected early as test examples.
