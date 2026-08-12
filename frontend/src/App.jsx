import { useCallback, useEffect, useRef, useState } from 'react'
import ImageUploader from './components/ImageUploader'
import PoseCanvas from './components/PoseCanvas'
import { downscaleImage, loadImageFromFile } from './lib/imageUtils'
import {
  checkBrowserSupport,
  detectBestPose,
  initPoseLandmarker,
} from './lib/poseEngine'

// One state machine to describe the whole screen at any moment. Keeping
// this as a single string avoids impossible combinations of booleans.
const STATUS = {
  CHECKING_SUPPORT: 'checking-support',
  UNSUPPORTED: 'unsupported',
  MODEL_LOADING: 'model-loading',
  MODEL_ERROR: 'model-error',
  READY: 'ready', // model loaded, waiting for an image
  DETECTING: 'detecting',
  RESULT: 'result', // pose found, skeleton drawn
  NO_PERSON: 'no-person',
  DETECT_ERROR: 'detect-error',
}

export default function App() {
  const [status, setStatus] = useState(STATUS.CHECKING_SUPPORT)
  const [errorMessage, setErrorMessage] = useState(null)

  const [sourceCanvas, setSourceCanvas] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [pose, setPose] = useState(null)
  const [multiplePeopleDetected, setMultiplePeopleDetected] = useState(false)

  const objectUrlRef = useRef(null)
  const canvasRef = useRef(null)

  // ---- Model lifecycle -----------------------------------------------

  const loadModel = useCallback(async () => {
    const support = checkBrowserSupport()
    if (!support.supported) {
      setStatus(STATUS.UNSUPPORTED)
      return
    }

    setStatus(STATUS.MODEL_LOADING)
    try {
      await initPoseLandmarker()
      setStatus(STATUS.READY)
    } catch {
      setStatus(STATUS.MODEL_ERROR)
    }
  }, [])

  useEffect(() => {
    loadModel()
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [loadModel])

  // ---- Upload -> downscale -> detect -----------------------------------

  const handleFileAccepted = useCallback(async (file) => {
    setErrorMessage(null)
    setPose(null)
    setStatus(STATUS.DETECTING)

    try {
      const { image, objectUrl } = await loadImageFromFile(file)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = objectUrl

      const { canvas, width, height } = downscaleImage(image)
      setSourceCanvas(canvas)
      setDimensions({ width, height })

      const landmarker = await initPoseLandmarker()
      const { pose: bestPose, multiplePeopleDetected: multi } = await detectBestPose(
        landmarker,
        canvas,
      )

      if (!bestPose) {
        setStatus(STATUS.NO_PERSON)
        return
      }

      setPose(bestPose)
      setMultiplePeopleDetected(multi)
      setStatus(STATUS.RESULT)
    } catch (err) {
      setErrorMessage(
        err?.message === 'MODEL_LOAD_FAILED'
          ? 'The pose model failed to load. Check your connection and try again.'
          : 'Something went wrong while analyzing this image. Please try a different photo.',
      )
      setStatus(STATUS.DETECT_ERROR)
    }
  }, [])

  const handleReset = useCallback(() => {
    setSourceCanvas(null)
    setPose(null)
    setErrorMessage(null)
    setMultiplePeopleDetected(false)
    setStatus(STATUS.READY)
  }, [])

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return
    try {
      const blob = await canvasRef.current.exportComposite()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pose-scan.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage('Could not prepare the file for download. Please try again.')
    }
  }, [])

  const isBusy = status === STATUS.DETECTING
  const canUpload =
    status === STATUS.READY ||
    status === STATUS.RESULT ||
    status === STATUS.NO_PERSON ||
    status === STATUS.DETECT_ERROR

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {status === STATUS.CHECKING_SUPPORT && <CenteredNote text="Checking your browser..." />}

        {status === STATUS.UNSUPPORTED && <UnsupportedBrowserNotice />}

        {status === STATUS.MODEL_LOADING && <ModelLoadingNote />}

        {status === STATUS.MODEL_ERROR && <ModelErrorNotice onRetry={loadModel} />}

        {canUpload && (
          <>
            <ImageUploader onFileAccepted={handleFileAccepted} disabled={isBusy} />

            {isBusy && <CenteredNote text="Detecting pose..." pulsing />}

            {status === STATUS.NO_PERSON && (
              <InlineNotice tone="warn">
                We couldn't find a person in that photo. Try a clearer, well-lit
                shot where the whole body (or most of it) is visible.
              </InlineNotice>
            )}

            {status === STATUS.DETECT_ERROR && errorMessage && (
              <InlineNotice tone="error">{errorMessage}</InlineNotice>
            )}

            {status === STATUS.RESULT && sourceCanvas && (
              <div className="flex flex-col items-center gap-4">
                <PoseCanvas
                  ref={canvasRef}
                  sourceCanvas={sourceCanvas}
                  pose={pose}
                  width={dimensions.width}
                  height={dimensions.height}
                />

                {multiplePeopleDetected && (
                  <p className="text-sm text-muted font-mono text-center">
                    Multiple people were detected — showing the highest-confidence pose only.
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-void font-semibold text-sm"
                  >
                    Download image
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-lg border border-border hover:border-faint transition-colors text-ink text-sm"
                  >
                    Try another photo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

// ---- Presentational bits -------------------------------------------------

function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        <svg className="w-6 h-6 text-confidence-high" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="9" r="3.2" fill="currentColor" />
          <path
            d="M16 12.5 L16 20 M16 15 L10 13 M16 15 L22 13 M16 20 L11 27 M16 20 L21 27"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div>
          <p className="font-mono font-semibold tracking-tight text-ink leading-none">PoseScan</p>
          <p className="text-xs text-muted mt-0.5">Client-side human pose estimation</p>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <p className="max-w-3xl mx-auto px-4 sm:px-6 py-4 text-xs text-faint font-mono">
        Runs entirely in your browser. Nothing is uploaded anywhere.
      </p>
    </footer>
  )
}

function CenteredNote({ text, pulsing }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulseDot" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-accent animate-pulseDot" style={{ animationDelay: '160ms' }} />
        <span className="w-2 h-2 rounded-full bg-accent animate-pulseDot" style={{ animationDelay: '320ms' }} />
      </div>
      <p className={`text-sm font-mono text-muted ${pulsing ? '' : ''}`}>{text}</p>
    </div>
  )
}

function ModelLoadingNote() {
  return (
    <div className="rounded-2xl border border-border bg-panel px-6 py-10 flex flex-col items-center gap-4 overflow-hidden relative">
      <div className="relative w-16 h-16 rounded-full border-2 border-border overflow-hidden">
        <div className="absolute inset-x-0 h-1/2 bg-accent/20 animate-scan" />
      </div>
      <div className="text-center">
        <p className="text-ink font-medium">Loading pose model...</p>
        <p className="text-sm text-muted font-mono mt-1">
          This only happens once per visit.
        </p>
      </div>
    </div>
  )
}

function UnsupportedBrowserNotice() {
  return (
    <InlineNotice tone="error" title="Your browser doesn't support pose detection">
      This app needs WebAssembly support, which your current browser doesn't
      provide. Please try a recent version of Chrome or Edge.
    </InlineNotice>
  )
}

function ModelErrorNotice({ onRetry }) {
  return (
    <div className="rounded-2xl border border-confidence-low/40 bg-confidence-low/5 px-6 py-8 flex flex-col items-center gap-4 text-center">
      <p className="text-ink font-medium">The pose model couldn't be loaded</p>
      <p className="text-sm text-muted max-w-sm">
        This usually means a network issue or timeout. Check your connection
        and try again.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-void font-semibold text-sm"
      >
        Retry
      </button>
    </div>
  )
}

function InlineNotice({ tone = 'warn', title, children }) {
  const toneClasses =
    tone === 'error'
      ? 'border-confidence-low/40 bg-confidence-low/5'
      : 'border-confidence-mid/40 bg-confidence-mid/5'
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${toneClasses}`} role="alert">
      {title && <p className="text-ink font-medium text-sm mb-1">{title}</p>}
      <p className="text-sm text-muted">{children}</p>
    </div>
  )
}
