# Aurora Walk · 雪林漫步

A quiet pixel forest walk beneath an emergent aurora. Current version: **1.0.1**. Made for **AI, Design & Creativity**.

[Try the live website](https://fanmyohlwl.github.io/AuroraWalk/) · [GitHub repository](https://github.com/fanmyohlwl/AuroraWalk)

## Try it locally

Requires Python 3, with no install or build step:

```sh
cd aurora-walk
python3 -m http.server 8091 --bind 127.0.0.1
```

Open `http://localhost:8091`. ES modules and camera access require a web server; double-clicking `index.html` is not supported.

## Interactions

- **Click the scene** or press **C**: cycle green, violet, crimson, ice blue. The four swatches select a palette directly. Move the mouse to gently influence the breeze.
- **Enable gestures**: allow the camera, then hold your hand in view for roughly 0.22 seconds, or move it a small distance in any direction. A random event releases snow from visible nearby trees or summons animals. Acceptance is relaxed to 35% confidence, with a two-second cooldown. Holding still does not repeatedly trigger events. The first use loads ml5 and its hand model over the network. Camera video stays in the browser; it is neither stored nor sent to a server by this app.
- **Forest event / W** triggers the same random event without a camera.
- **D / Debug** shows the exact model input frame (mirrored for display), detected hand landmarks and connections, confidence, inference FPS, input dimensions, TensorFlow backend, cooldown and event counts. Debug does not automatically turn on the camera. Closing the debug window keeps tracking active; use **Turn off camera** to stop tracking and release the stream.
- The interface starts in **English** on every visit. **中文 / EN** switches the entire interface, dialogs, errors and debug labels. Decorative titles and taglines have been removed.
- **Space** pauses the entire scene. **H** hides the interface. Fullscreen is available where supported.
- With the operating system's reduced motion preference, the scene starts paused.

The forest contains reindeer, red foxes, snow hares, wolves and owls, with varying sizes. Trees and snow marks reuse a bounded pool, so the walk can continue indefinitely. A new visit starts with a different random seed.

## Plain-language rules for the assignment

See [口头说明](docs/rules-zh.md). The aurora is not a playing video: cells exchange light and motion with their two neighbors, with small local energy inputs and damping. The animal movement includes local alignment and separation. Snow drifts with the same breeze as the light. The camera's forward motion makes world objects grow and move outward as they approach. The ground is continuous snow, with no road surface or borders. Trees are 18% larger and animal sizes are 50% larger than 1.0.0. Aurora shading uses a limited set of stepped pixel tones instead of smooth gradients and fine vertical lines.

## Video recording

Click **Record**, select a size and duration, and start. Default: 1920 × 1080, target 30 fps, 15 seconds. Only the scene canvas is recorded; controls, captions, toast messages and the camera preview are excluded. Output is MP4 where browser encoding supports H.264, otherwise WebM. Automatic download starts on completion. Available output sizes include 1280 × 720 and 1080 × 1920.

Recording uses actual browser rendering. Actual frame rate depends on the device. Keep the tab visible while recording; background tabs may be throttled. Choose 720p on slower computers. Alternate aspect ratios crop the scene centrally, without stretching it. The manual recording option stops automatically after three minutes to bound memory use. The animation has no audio track.

### Recording and automation interface

The public API is `window.auroraWalk`:

```js
// Query: palette, distance, animals, event count, camera, pause/record status.
console.log(auroraWalk.state);

// Scene controls.
auroraWalk.setPalette(1);              // 0 green, 1 violet, 2 red, 3 blue
auroraWalk.triggerEvent('snow');       // 'animal' or omit for random
auroraWalk.pause();
auroraWalk.resume();
auroraWalk.setImmersive(true);
auroraWalk.setLanguage('zh');            // 'en' restores English
await auroraWalk.setDebug(true);        // Does not turn on the camera
console.log(auroraWalk.tracking);       // phase, hands, confidence, fps, backend, input, cooldown

// Start from a button click or other user gesture for browser compatibility.
await auroraWalk.recording.start({
  width: 1920, height: 1080, fps: 30,
  duration: 15, download: true
});

// Stop manually; await the final encoded Blob, not an unfinished stream.
const { blob, extension, width, height, fps, duration } =
  await auroraWalk.recording.stop();

// For automation, set download:false and save the returned Blob yourself.
// duration:0 means manual stop, with a 180-second cap.
// Invalid sizes, rates, durations, or simultaneous recordings are rejected.

const pngDataURL = auroraWalk.captureFrame({ width: 1920, height: 1080 });
```

## GitHub Pages

The live website is [fanmyohlwl.github.io/AuroraWalk](https://fanmyohlwl.github.io/AuroraWalk/).

Publishing is enabled under **Settings → Pages** with **Deploy from a branch**, branch **main**, and folder **/ (root)**. Pushing a new commit to main automatically rebuilds and publishes the website. Include the repository and live website addresses in the assignment.

`.nojekyll` is included. All application imports are relative, so repository subpaths work. GitHub Pages uses HTTPS, allowing the optional camera interaction. No API keys, backend or billing account are required.

## Structure

- `js/simulation.js`: seeded randomness, neighbor-coupled aurora field, forest pools, animal rules, snow and relaxed hand presence/movement detector.
- `js/renderer.js`: the actual pixel canvas scene and generated sprites.
- `js/gestures.js`: lazy-loaded ml5 HandPose, throttled detection, camera lifecycle and recoverable errors.
- `js/recorder.js`: clean-scene MediaRecorder output and Blob interface.
- `js/main.js`: UI, animation loop and public API.

## Verification

```sh
npm test
```

Optional real-browser checks need Playwright and an available Chromium browser. `tools/check-browser.mjs` checks the controls, mobile layout and a recorded clip. `tools/check-gestures.mjs` uses a **synthetic camera**, tries the real ml5 model, and checks wave events and cleanup with simulated hand landmarks. They do not access a real camera. Set `AURORA_NODE_MODULES` and `AURORA_CHROME_PATH` when using an external development runtime. See [testing notes](docs/TESTING.md).

## References and attribution

- [ml5 HandPose documentation](https://docs.ml5js.org/#/reference/handpose)
- [Official ml5 HandPose implementation](https://github.com/ml5js/ml5-next-gen/blob/main/src/HandPose/index.js): model readiness and HTML-video inference API.
- [ml5 1.3.1 distribution](https://cdn.jsdelivr.net/npm/ml5@1.3.1/dist/ml5.min.js): loaded only when gestures are enabled. Its trained model files are fetched separately by ml5.

Original canvas artwork and scene code are included in this repository. No photos, prerecorded video, fonts or stock sprites are downloaded for the scene. Code is released under the MIT license; ml5 and model dependencies retain their own licenses.

## Local Git versions

- `1.0.0`: the completed original version, committed before these changes.
- `1.0.1`: the snow-only walk, stepped pixel aurora, larger trees/animals, relaxed tracking, D debug panel and English/Chinese interface.

Both annotated tags and the latest code are published at [fanmyohlwl/AuroraWalk](https://github.com/fanmyohlwl/AuroraWalk). The main branch also includes the subsequent HandPose input fix and is the publishing source for GitHub Pages.
