# Vision

The working name is **Shadowplay**. The old name for the art of hand shadows is **ombromanie** (unchecked).

## In one sentence

Something that teaches you to make hand shadow puppets: it shows you a shape, watches your hands through a camera, tells you how close you are, and brings the puppet to life when you have it.

## What it is like

1. You walk up to a softly lit wall. A shadow hand is playing on it, turning into a rabbit, then a duck, then a dog.
2. You hold up your own hand and its shadow appears. Cards along the bottom show the puppets you can make: how to hold your hand, and the shadow it makes.
3. As you get close to one, its card lights up and the wall says what to change.
4. When you have it, the puppet comes alive: the dog's mouth opens and it barks when you move your little finger, the bird flaps when you move your hands.

## Where it comes from

- **Hand tracking from the aquarium.** The aquarium already follows hands through a webcam using MediaPipe, a free Google library that finds 21 points on each hand (the fingertips, knuckles and wrist). Recognising a puppet shape is the same tracking put to a different use.
- **Projection.** The most magical version uses real shadows: a projector as the lamp, your hands casting real shadows on a wall, and the projection adding to them. See [ideas](ideas.md).

## Who it is for

An interactive installation in a gallery or museum, for visitors of all ages ([decision 3](decisions.md#3-a-gallery-installation-for-all-ages)). People walk up with no instructions, often in groups and often with small children who cannot yet read, and leave when they like. So there is no menu: the wall listens for every puppet at once, pictures carry the meaning, nearly right counts, and when nobody is there a demonstration hand plays to invite the next person in.

The camera picture is never shown or kept; only the points on your hands are used ([decision 7](decisions.md#7-the-camera-picture-is-never-shown-or-kept)).
