# Verification notes

## 1.0.0 verification

Verified on 2026-10-05, using a locally served page and an isolated Chrome browser.

- Desktop 1440 × 900: scene renders with no uncaught application errors.
- Mobile 390 × 844: scene resizes, all controls fit, no horizontal document overflow.
- Color swatches and canvas clicks change the palette; the simulation eases the displayed RGB values.
- Pause holds simulation time; resume restarts movement. H toggles the interface.
- Instructions and recording dialogs open and close.
- A 640 × 360 test recording returned a nonempty H.264/MP4 Blob. `ffprobe` verified the video stream, dimensions and duration. The recorded image comes from the scene canvas, so no controls or camera preview are in the output.
- A five-minute simulated walk stays finite. Tree count remains 155, animals remain capped, and event snow is cleaned up.
- Stationary landmark jitter does not count as a wave. A left-right-left motion counts once; cooldown and missing-hand reset are tested.
- Real **ml5 1.3.1** loaded its HandPose model and ran live inference with Chrome's synthetic camera stream. In a vanilla JavaScript page this version returns a Promise for the model; initialization waits for it.
- Simulated hand landmarks passed through the actual gesture controller and triggered one forest event.
- Closing the camera and a forced ml5 network error both released the stream and restored the button interface.

A real person's hand and a physical camera have not been tested by this task. Room lighting, camera placement and model confidence affect recognition. The manual event button and W key remain available independently of ml5 or camera access.

Recording targets 30 fps but follows the browser's actual render/encoding throughput. Short headless verification recordings are not a guarantee of 30 fps on every device. Keep the tab foregrounded and use 720p if necessary. GitHub Pages publishing has not been performed in this local-first version.

## 1.0.1 update

- Six automated tests pass: the five-minute bounded walk; one initial hand-presence event; no repeat from holding/jitter; small horizontal or vertical movement without reversals; dropout/re-entry handling; smooth colors; and gesture-controller confidence/stats/localization checks.
- Simulated **40% confidence** hand landmarks pass through the actual GestureController and trigger the scene. **34% confidence** does not trigger, while debug reports a low-confidence hand.
- The live in-app browser was checked at its normal viewport and 390 × 844: stepped aurora, snow without a road, larger sprites, English default, Chinese switching, D debug toggle and event statistics. Every visible mobile control fits inside the viewport.
- The recording dialog displays English resolution/duration choices and reports MP4 support. The encoding path is retained from the verified 1.0.0 implementation.
- The tests use synthetic landmarks. This update has not been tested with a real person's hand or physical camera. Use D to check your hand confidence, input image and event counter when trying your camera.
