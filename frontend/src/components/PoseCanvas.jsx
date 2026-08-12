import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { POSE_CONNECTIONS } from '../lib/poseEngine'

const HIGH = '#4FE3C1' // confidence.high
const MID = '#F2B84B' // confidence.mid
const LOW = '#F0625B' // confidence.low

function colorForVisibility(v) {
  if (v >= 0.75) return HIGH
  if (v >= 0.4) return MID
  return LOW
}

function visibilityOf(lm) {
  return typeof lm.visibility === 'number' ? lm.visibility : 1
}

/**
 * Renders the (already downscaled) source image on a base canvas, and the
 * detected skeleton on a transparent overlay canvas stacked on top of it.
 * Keeping them separate means we can redraw the skeleton on every detection
 * without re-drawing the full image.
 *
 * Exposes `exportComposite()` via ref, which flattens both layers into a
 * single canvas for download.
 */
const PoseCanvas = forwardRef(function PoseCanvas({ sourceCanvas, pose, width, height }, ref) {
  const imageCanvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)

  // Draw the base image whenever the source changes.
  useEffect(() => {
    const canvas = imageCanvasRef.current
    if (!canvas || !sourceCanvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(sourceCanvas, 0, 0, width, height)
  }, [sourceCanvas, width, height])

  // Draw the skeleton overlay whenever the pose changes.
  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    if (!pose) return

    drawSkeleton(ctx, pose, width, height)
  }, [pose, width, height])

  useImperativeHandle(ref, () => ({
    /**
     * Flattens image + overlay into one canvas and resolves a PNG Blob.
     */
    exportComposite() {
      return new Promise((resolve, reject) => {
        const composite = document.createElement('canvas')
        composite.width = width
        composite.height = height
        const ctx = composite.getContext('2d')
        if (imageCanvasRef.current) ctx.drawImage(imageCanvasRef.current, 0, 0)
        if (overlayCanvasRef.current) ctx.drawImage(overlayCanvasRef.current, 0, 0)
        composite.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Could not generate the image file.'))
        }, 'image/png')
      })
    },
  }))

  return (
    <div
      className="relative mx-auto max-w-full rounded-xl overflow-hidden border border-border bg-panel"
      style={{ width, maxWidth: '100%' }}
    >
      <canvas ref={imageCanvasRef} className="block w-full h-auto" />
      <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
})

export default PoseCanvas

function drawSkeleton(ctx, landmarks, width, height) {
  ctx.lineWidth = Math.max(2, width * 0.004)

  // Connectors first, so joints render on top of the lines.
  POSE_CONNECTIONS.forEach(([aIdx, bIdx]) => {
    const a = landmarks[aIdx]
    const b = landmarks[bIdx]
    if (!a || !b) return
    const v = Math.min(visibilityOf(a), visibilityOf(b))
    ctx.strokeStyle = colorForVisibility(v)
    ctx.beginPath()
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
    ctx.stroke()
  })

  // Joints.
  const radius = Math.max(3, width * 0.006)
  landmarks.forEach((lm) => {
    const v = visibilityOf(lm)
    ctx.fillStyle = colorForVisibility(v)
    ctx.beginPath()
    ctx.arc(lm.x * width, lm.y * height, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}
