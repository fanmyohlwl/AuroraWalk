# Versions

## 1.0.1

- Changed the aurora to stepped, limited-tone pixels with stippled edges, matching the forest sprites. Removed the smooth curtain gradients and fine vertical rays.
- Replaced the road with continuous snow; retained subtle snow marks for forward-motion depth.
- Enlarged trees by 18% and animals by 50%. Snow events select trees in the visible field.
- Relaxed hand confidence from 65% to 35%. Stable hand presence (~0.22 seconds) or small movement in any direction (~4.5% of the camera frame) triggers an event. No left-right-left reversal is needed. Cooldown is two seconds; a stationary hand and small landmark jitter do not repeatedly trigger events.
- Added D/Debug: mirrored camera input, landmarks/connections, confidence, inference FPS, resolution, cooldown and event count. Closing debug leaves tracking active; Turn off camera releases the stream.
- Removed scene titles, wordmark and decorative taglines. Added English/Chinese switching, defaulting to English on every new visit, including dialogs, errors and tracking states.
- Preserved the clean-scene video recording interface.

## 1.0.0

Original completed forest walk, preserved before the 1.0.1 edits.
