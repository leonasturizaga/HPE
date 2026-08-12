// Thin wrapper around @mediapipe/tasks-vision's PoseLandmarker.
// Keeps all MediaPipe-specific details (CDN paths, delegate fallback,
// multi-pose selection) out of the React components.

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

// The 33-point BlazePose skeleton connections (index pairs) used to draw
// the "bones" between landmarks.
export const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
]

/**
 * Checks whether this browser can plausibly run the pose model at all.
 * We check this BEFORE attempting to load the model so we can show a
 * friendly message instead of a cryptic failure.
 */
export function checkBrowserSupport() {
  if (typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function') {
    return { supported: false, reason: 'wasm' }
  }

  let hasWebGL = false
  try {
    const testCanvas = document.createElement('canvas')
    hasWebGL = !!(
      testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')
    )
  } catch {
    hasWebGL = false
  }

  if (!hasWebGL) {
    // Not a hard blocker on its own — we can still fall back to a CPU
    // delegate — but it's worth knowing about if load later fails.
    return { supported: true, reason: null, gpuAvailable: false }
  }

  return { supported: true, reason: null, gpuAvailable: true }
}

let landmarkerPromise = null

/**
 * Creates (or reuses) the PoseLandmarker instance. Tries the GPU delegate
 * first for speed, and falls back to CPU if GPU init fails.
 */
export async function initPoseLandmarker() {
  if (landmarkerPromise) return landmarkerPromise

  landmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE)

    const baseOptions = {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      numPoses: 5,
    }

    try {
      return await PoseLandmarker.createFromOptions(vision, baseOptions)
    } catch (gpuError) {
      // Retry once on CPU — common on browsers/devices without a
      // usable WebGL implementation for MediaPipe's GPU delegate.
      try {
        return await PoseLandmarker.createFromOptions(vision, {
          ...baseOptions,
          baseOptions: { ...baseOptions.baseOptions, delegate: 'CPU' },
        })
      } catch (cpuError) {
        throw new Error('MODEL_LOAD_FAILED')
      }
    }
  })().catch((err) => {
    // Reset so a later retry attempt can try again from scratch.
    landmarkerPromise = null
    throw err
  })

  return landmarkerPromise
}

export function resetPoseLandmarker() {
  landmarkerPromise = null
}

/**
 * Runs detection on an image-like source (HTMLImageElement or HTMLCanvasElement)
 * and returns only the single best pose (highest average landmark visibility),
 * plus a flag for whether more than one person was detected.
 */
export async function detectBestPose(landmarker, source) {
  const result = landmarker.detect(source)
  const poses = result?.landmarks ?? []

  if (poses.length === 0) {
    return { pose: null, multiplePeopleDetected: false }
  }

  let bestIndex = 0
  let bestScore = -Infinity

  poses.forEach((landmarks, index) => {
    const score = averageVisibility(landmarks)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return {
    pose: poses[bestIndex],
    confidence: bestScore,
    multiplePeopleDetected: poses.length > 1,
  }
}

function averageVisibility(landmarks) {
  if (!landmarks || landmarks.length === 0) return 0
  let sum = 0
  let count = 0
  for (const lm of landmarks) {
    // `visibility` may be undefined on some builds; treat missing as 1.
    const v = typeof lm.visibility === 'number' ? lm.visibility : 1
    sum += v
    count += 1
  }
  return count > 0 ? sum / count : 0
}
