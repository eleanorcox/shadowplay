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
| [2](#2-recognition-is-separate-from-the-camera) | Recognition is separate from the camera | 17 Nov 2026 | Decided |
| [3](#3-a-gallery-installation-for-all-ages) | A gallery installation for all ages | 18 Nov 2026 | Decided |
| [4](#4-recognise-from-hand-points-on-a-screen-first) | Recognise from hand points, on a screen first | 18 Nov 2026 | Decided |
| [5](#5-typescript-in-the-browser-with-mediapipe) | TypeScript in the browser with MediaPipe | 18 Nov 2026 | Decided |
| [6](#6-free-play-no-menu) | Free play: no menu, every puppet listened for at once | 18 Nov 2026 | Decided |
| [7](#7-the-camera-picture-is-never-shown-or-kept) | The camera picture is never shown or kept | 18 Nov 2026 | Decided |
| [8](#8-a-model-hand-draws-the-lessons-and-the-demo) | A model hand draws the lessons, the demo and the test examples | 18 Nov 2026 | Decided |
| [9](#9-puppets-are-lists-of-kind-checks) | Puppets are lists of checks, each with a kind hint | 18 Nov 2026 | Decided |
| [10](#10-first-puppets-rabbit-duck-dog) | First puppets: rabbit, duck, dog | 18 Nov 2026 | Decided |

## 1. Working name: Shadowplay

- **Date:** 17 November 2026
- **Status:** Decided
- **What prompted it:** Setting up repositories for several new projects. The idea was something that teaches hand shadow puppets, using a camera to recognise hand gestures.
- **Decision:** Shadowplay, as a working name; the repository and folder are `shadowplay`.
- **Alternatives considered:** Ombromanie (the old French name for the art; distinctive but hard to spell), Hand Shadows (plain).
- **What follows from it:** None yet.

## 2. Recognition is separate from the camera

- **Date:** 17 November 2026
- **Status:** Decided (18 November 2026, when building started)
- **What prompted it:** The aquarium's rule that input adapters never touch the page, which made its hand input testable.
- **Decision:** Recognising a puppet takes recorded hand points (or pictures) as input and returns a score and hints. The live camera is only an adapter that feeds it.
- **Alternatives considered:** Recognising straight from the live camera. Quicker to start, but impossible to test without someone holding up their hands.
- **What follows from it:** A small library of recorded hand positions, good and bad, is collected early as test examples.

## 3. A gallery installation for all ages

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Eleanor answered the first open question: assume it is an interactive installation in a gallery or museum, visited by people of all ages.
- **Decision:** Shadowplay is designed as an installation first. Visitors walk up with no instructions, often in groups, often young children who cannot read yet, and leave whenever they like. Nobody is there to restart it.
- **Alternatives considered:** A website for learning at home (could still come later, since it runs in a browser); a children-only lesson app (too narrow for a museum, where grandparents and toddlers stand side by side).
- **What follows from it:** No menus, keyboard or touch screen for visitors ([6](#6-free-play-no-menu)). Pictures carry the meaning and words are short. Recognition is forgiving, and works for small hands and for either hand. Only one-handed puppets come first, so anyone with one free hand can join in. It must run all day unattended: it recovers when the camera drops out, and shows something inviting when nobody is there. The camera picture is never shown or stored ([7](#7-the-camera-picture-is-never-shown-or-kept)).

## 4. Recognise from hand points, on a screen first

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Open questions 2 and 3, settled by taking the proposed answers so building could start; Eleanor asked for momentum.
- **Decision:** Puppets are recognised from MediaPipe's 21 hand points, not from the silhouette. The first version is a webcam and a screen: the screen shows a lamp-lit wall and draws your hands' shadows on it from the hand points.
- **Alternatives considered:** Silhouettes (truer to a real shadow, but need a plain background and cannot say which finger to move). Projector first (more magical, but slower to build and test, and the projector is not bought).
- **What follows from it:** Because the shadow is drawn from points, the screen version never needs the camera picture itself. Real shadows with a projector stay on the roadmap as a later stage; the recognition carries over unchanged, and silhouettes can be added beside it then.

## 5. TypeScript in the browser with MediaPipe

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Open question 4; the aquarium already tracks hands this way.
- **Decision:** TypeScript, Vite and Vitest, with `@mediapipe/tasks-vision`, the same versions as the aquarium. The hand-tracking model and its runtime are served from the project, so the installation works with no internet connection.
- **Alternatives considered:** Python with OpenCV (no shared code with the aquarium, and harder to run as a kiosk); a native app (more to install for an exhibition machine).
- **What follows from it:** The installation is a browser in full-screen kiosk mode on one computer with a webcam. The aquarium's camera adapter is copied, not shared, so each project can change it freely.

## 6. Free play, no menu

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** In a gallery there is no mouse, and a toddler will not pick from a menu.
- **Decision:** There is no "choose a puppet" step. Every puppet is listened for at once, for every hand in view. Cards along the bottom of the wall show the puppets you can make; the one you are closest to lights up, and each one you make gets a star for this visit. One card at a time is gently suggested. When nobody has been in view for a while, the stars are cleared for the next visitors and a demonstration hand plays on the wall.
- **Alternatives considered:** Pointing at a card to choose it (needs a gesture to learn before you can play); lessons in a fixed order (people arrive and leave mid-lesson).
- **What follows from it:** Recognition has to tell every puppet apart from every other and from ordinary hands, not just answer "is this a rabbit?". Hints are given for whichever puppet you are nearest to.

## 7. The camera picture is never shown or kept

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Museums are careful about cameras in public spaces, and children are among the visitors.
- **Decision:** The camera picture goes only to the hand tracker, on the installation computer. It is never drawn on screen, saved or sent anywhere. Only the 21 points per hand are used, and those are kept only for the moment. A short sign can say exactly this.
- **Alternatives considered:** Showing the camera picture in a corner so visitors can see what it sees (helpful, but shows faces). Keeping recordings to improve recognition (the recorder exists for Eleanor's own hands during development, off in the installation).
- **What follows from it:** The shadow on the wall is drawn from the points. The only recording tool is a development key that saves points, never pictures.

## 8. A model hand draws the lessons, the demo and the test examples

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Open question 5 (where the lesson pictures come from), and needing test examples before anyone has recorded real hands.
- **Decision:** A model hand in the core turns a few numbers (how much each finger bends, where the thumb goes, which way the hand points) into the same 21 points MediaPipe gives. It poses the hand for each puppet. The same poses draw the puppet cards, play the demonstration when nobody is there, and serve as the first test examples.
- **Alternatives considered:** Drawn illustrations (Eleanor's or licensed; better looking, but each puppet needs new art and they cannot be tested against). Recording real hands first (needed anyway, but would hold up building).
- **What follows from it:** The puppet cards always match what the recogniser expects. Test examples from the model hand are idealised, so recordings of real hands, including children's, must be added before the thresholds are trusted ([testing](testing.md)). Hand-drawn art can replace the cards later without changing anything else.

## 9. Puppets are lists of kind checks

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Feedback has to say what to change, and a nearly-right puppet has to count.
- **Decision:** The hand points are first turned into a description of the pose that does not depend on where the hand is, how big it is, or whether it is a left or right hand: how bent each finger is, whether the thumb touches a fingertip, whether the fingers are together, which way they point. A puppet is a short list of checks on that description, each with an ideal range, a margin either side where it partly counts, and a hint ("Fold your last two fingers down"). The match score is the weighted average. A puppet counts at 0.8, not 1. The hint shown is the check that is furthest off.
- **Alternatives considered:** Comparing all 21 points with a stored example (one number, no reason why); a trained classifier (needs many recordings, and cannot explain itself).
- **What follows from it:** Adding a puppet is a list of checks and a model-hand pose. Thresholds are in one place and can be loosened for small hands after trying it with children.

## 10. First puppets: rabbit, duck, dog

- **Date:** 18 November 2026
- **Status:** Decided
- **What prompted it:** Choosing which puppets to build first (open question 5).
- **Decision:** Three one-handed puppets that look clearly different from one another: the rabbit (two fingers up for ears, the others folded under the thumb), the duck (fingers straight and together, thumb underneath as the beak) and the dog (fingers straight and pointing sideways for the snout, thumb up as an ear, little finger drops to open the mouth). The duck and the dog have something to do once made: open and close the beak or mouth.
- **Alternatives considered:** The swan and the snail (harder to tell apart from the hand points alone); the bird and the butterfly (need two hands; they come in a later stage).
- **What follows from it:** The hand positions are the common versions, written from memory (unchecked against a book on hand shadows).
