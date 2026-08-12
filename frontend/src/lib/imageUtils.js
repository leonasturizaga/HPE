// Image loading + client-side downscale helpers.
// Everything here runs on the client, no backend involved.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
export const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024 // 12MB
export const MAX_LONG_EDGE = 1024

/**
 * Validate a File before we try to do anything with it.
 * Returns { valid: boolean, error?: string }
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' }
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a JPG or PNG image.',
    }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
    return {
      valid: false,
      error: `File is too large. Please upload an image under ${maxMb}MB.`,
    }
  }
  if (file.size === 0) {
    return { valid: false, error: 'This file appears to be empty.' }
  }
  return { valid: true }
}

/**
 * Load a File into an HTMLImageElement.
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ image: img, objectUrl })
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read this image. The file may be corrupted.'))
    }
    img.src = objectUrl
  })
}

/**
 * Downscale an image on an offscreen canvas so its long edge is at most
 * `maxLongEdge`, preserving aspect ratio. If the image is already smaller,
 * it is returned at its original size (we never upscale).
 * Returns a canvas ready to be used for detection and display.
 */
export function downscaleImage(image, maxLongEdge = MAX_LONG_EDGE) {
  const { naturalWidth: width, naturalHeight: height } = image
  const longEdge = Math.max(width, height)
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1

  const targetWidth = Math.round(width * scale)
  const targetHeight = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

  return { canvas, width: targetWidth, height: targetHeight, scale }
}
