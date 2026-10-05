# Verification notes

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
