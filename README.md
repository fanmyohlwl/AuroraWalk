# Aurora Walk · 雪林漫步

A quiet pixel forest walk beneath an emergent aurora. Made for **AI, Design & Creativity**.

## Try it locally

Requires Python 3, with no install or build step:

```sh
cd aurora-walk
python3 -m http.server 8091 --bind 127.0.0.1
```

Open `http://localhost:8091`. ES modules and camera access require a web server; double-clicking `index.html` is not supported.

## Interactions

- **Click the scene** or press **C**: cycle green, violet, crimson, ice blue. The four swatches select a palette directly. Move the mouse to gently influence the breeze.
- **Enable gestures**: allow the camera, then wave left-right-left. A random event releases snow from nearby trees or summons animals. The first use loads ml5 and its hand model over the network. Camera video stays in the browser; it is neither stored nor sent to a server by this app.
- **森林惊喜 / W** triggers the same random event without a camera.
- **Space** pauses the entire scene. **H** hides the interface. Fullscreen is available where supported.
- With the operating system's reduced motion preference, the scene starts paused.

The forest contains reindeer, red foxes, snow hares, wolves and owls, with varying sizes. Trees and snow marks reuse a bounded pool, so the walk can continue indefinitely. A new visit starts with a different random seed.

## Plain-language rules for the assignment

See [口头说明](docs/rules-zh.md). The aurora is not a playing video: cells exchange light and motion with their two neighbors, with small local energy inputs and damping. The animal movement includes local alignment and separation. Snow drifts with the same breeze as the light. The camera's forward motion makes world objects grow and move outward as they approach.

## Video recording

Click **录制**, select a size and duration, and start. Default: 1920 × 1080, target 30 fps, 15 seconds. Only the scene canvas is recorded; controls, captions, toast messages and the camera preview are excluded. Output is MP4 where browser encoding supports H.264, otherwise WebM. Automatic download starts on completion. Available output sizes include 1280 × 720 and 1080 × 1920.

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

This is a static website, ready for GitHub Pages:

1. Create a repository and upload the **contents of this `aurora-walk` directory** to its root. No `sources/` or previous project files are needed.
2. Under **Settings → Pages**, choose **Deploy from a branch**, your default branch, and **/ (root)**.
3. The public address will be `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`.
4. Include the repository address and Pages address in your assignment.

`.nojekyll` is included. All application imports are relative, so repository subpaths work. GitHub Pages uses HTTPS, allowing the optional camera interaction. No API keys, backend or billing account are required. This version is local; no repository has been created or deployed by this task.

## Structure

- `js/simulation.js`: seeded randomness, neighbor-coupled aurora field, forest pools, animal rules, snow and wave detector.
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
