# PoseScan — HPE MVP (V1)

Client-side human pose estimation: upload a photo → detect a skeleton →
download the image with the overlay. No backend, no auth, no video — all
out of scope for this version.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`) in
Chrome or Edge and upload a JPG/PNG with a person in it.

> First run needs internet access: MediaPipe's WASM runtime and the pose
> model are fetched from a CDN / Google Cloud Storage the first time the
> app loads (see `src/lib/poseEngine.js`). They're cached by the browser
> after that.

## What's implemented

- **`src/components/ImageUploader.jsx`** — drag/drop + click-to-browse,
  validates file type (JPG/PNG only) and size (12MB cap), shows a clear
  inline error for anything rejected.
- **`src/lib/imageUtils.js`** — loads the file into an `<img>`, then
  downscales it on an offscreen canvas so the long edge is capped at
  1024px (aspect ratio preserved, never upscales).
- **`src/lib/poseEngine.js`** — wraps `@mediapipe/tasks-vision`'s
  `PoseLandmarker`: browser-support check, GPU-delegate init with a CPU
  fallback, and picking the single best pose (highest average landmark
  visibility) when multiple people are detected.
- **`src/components/PoseCanvas.jsx`** — draws the image on one canvas and
  the skeleton on a transparent canvas layered on top (color-coded by
  per-landmark confidence: teal = high, amber = medium, red = low).
  Exposes `exportComposite()` to flatten both layers for download.
- **`src/App.jsx`** — the state machine tying it together, plus every
  edge case from the brief:
  - Unsupported browser (no WebAssembly) → fallback message, checked
    *before* attempting to load the model.
  - Model load failure (network/timeout) → error message + **Retry**.
  - No person detected → clear inline message, no crash.
  - Multiple people detected → only the highest-confidence pose is drawn,
    with a small note under the image saying so.
  - "Loading pose model..." is always visible while the model initializes
    — the screen is never blank.

## Notes / things to sanity-check on your machine

- The pose model is fetched from
  `storage.googleapis.com/mediapipe-models/...` — if your network blocks
  that domain, model load will fail (which is exactly the "model failed
  to load" path, so it's a good way to test that state too).
- `vite.config.js` sets `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Embedder-Policy` headers for the dev server, which helps
  MediaPipe's WASM build run at full speed. Safe to remove if it causes
  issues with anything else you add later.
- Landmark `visibility` isn't always populated depending on the model
  variant; `poseEngine.js` treats a missing value as fully visible (1.0)
  rather than failing.

## Not in this version (by design)

Auth, video input, multi-person rendering, and any backend/Spring Boot
calls — all intentionally out of scope for V1.
