# Ideas

Every idea so far, each with the smallest version worth building. Sizes are rough guesses: **S** is a few days, **M** is a week or two, **L** is a month or more.

## Summary

| Idea | Size | Needs hardware |
| --- | --- | --- |
| Recognise one puppet | M | webcam |
| Lessons for a set of puppets | M | webcam |
| Feedback on what to change | M | webcam |
| Puppets that come alive | M | webcam |
| Two-handed puppets | S, after one-handed | webcam |
| Real shadows with a projector | L | projector, webcam |
| A shadow theatre | L | projector |
| Make up your own puppet | M | webcam |
| A sign and a quiet-hours mode | S | none |

## Recognise one puppet

Two ways to tell what shape your hands are making:

- **From hand points.** MediaPipe gives 21 points per hand. A puppet is a pattern of finger angles and positions, compared with a stored example. Works with any background and lighting the hand tracker copes with, and says exactly which finger is wrong.
- **From the silhouette.** Cut the hands out of the picture as a solid shape and compare it with the puppet's shadow. Closer to what a shadow actually looks like (a rabbit is a rabbit whatever the fingers are doing), but needs a plain background or a real shadow to work from.

- **Smallest version:** a rabbit (the easiest one-handed puppet), recognised from hand points, with a match score shown on screen. Tested on recorded hand positions of a good rabbit, a nearly-rabbit and a fist.

## Lessons for a set of puppets

Started with rabbit, duck and dog; now also spider, butterfly, walker, candle, tree and heart. Other candidates: snail, crocodile, a face in profile. Two puppets must cast shadows that look different ([decision 12](decisions.md#12-puppets-must-look-different-and-not-all-animals)). Each lesson has a picture of the hands, the shadow it makes, and steps.

## Feedback on what to change

"Raise your thumb", "fingers closer together", "turn your hand sideways". From the hand points, the biggest difference from the stored example becomes the hint.

## Puppets that come alive

When the shape is held, the shadow turns into the puppet: the dog barks as you open its mouth, the bird flies off, the rabbit's ears twitch. A reward, and a reason to try the next one.

## Two-handed puppets

The bird, the butterfly and the deer need both hands. The tracker follows two hands already.

## Real shadows with a projector

The projector is the lamp. It throws plain light at a wall; your hands cast real shadows; the camera watches the wall. Then the projection can add to the shadow: an eye for the dog, grass for the rabbit, a sky for the bird. The projection and the camera have to agree where things are, which is the same job as the aquarium's corner correction.

## A shadow theatre

Several people, a story read out, and each scene asks for a puppet. When it appears, the story moves on.

## Make up your own puppet

Hold any shape; it is saved as a new puppet with a name you give it, and others can learn it.

## A sign and a quiet-hours mode

A printed sign beside the installation: what it does, in pictures, and that the camera picture is never shown or kept. A setting that dims the wall and stops the demo outside opening hours, so the screen is not burning in all night.
