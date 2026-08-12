import { useCallback, useRef, useState } from 'react'
import { validateImageFile, ACCEPTED_TYPES, MAX_FILE_SIZE_BYTES } from '../lib/imageUtils'

const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
const MAX_MB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)

/**
 * Drag/drop + click-to-browse image picker.
 * Calls onFileAccepted(file) with a validated File, or shows an inline
 * error and calls onFileRejected(message) when validation fails.
 */
export default function ImageUploader({ onFileAccepted, onFileRejected, disabled }) {
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState(null)
  const inputRef = useRef(null)
  const dragCounter = useRef(0)

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0]
      const { valid, error } = validateImageFile(file)
      if (!valid) {
        setLocalError(error)
        onFileRejected?.(error)
        return
      }
      setLocalError(null)
      onFileAccepted(file)
    },
    [onFileAccepted, onFileRejected],
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragging(false)
      if (disabled) return
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles, disabled],
  )

  const onDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onInputChange = useCallback(
    (e) => {
      handleFiles(e.target.files)
      // reset so selecting the same file again still fires onChange
      e.target.value = ''
    },
    [handleFiles],
  )

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        className={[
          'relative flex flex-col items-center justify-center gap-3',
          'w-full min-h-[280px] rounded-2xl px-6 py-10 text-center',
          'border border-dashed transition-colors duration-150 cursor-pointer select-none',
          disabled
            ? 'opacity-50 cursor-not-allowed border-border bg-panel'
            : isDragging
              ? 'border-accent bg-accent/[0.06]'
              : 'border-border bg-panel hover:border-faint hover:bg-panel-alt',
        ].join(' ')}
      >
        {/* Viewfinder corner marks — reinforces "target a pose" framing */}
        <Corner className="top-3 left-3" />
        <Corner className="top-3 right-3 rotate-90" />
        <Corner className="bottom-3 right-3 rotate-180" />
        <Corner className="bottom-3 left-3 -rotate-90" />

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="Upload an image"
        />

        <UploadIcon active={isDragging} />

        <div>
          <p className="text-ink font-medium">
            {isDragging ? 'Drop it here' : 'Drag & drop a photo, or click to browse'}
          </p>
          <p className="mt-1 text-sm text-muted font-mono">
            JPG or PNG · up to {MAX_MB}MB
          </p>
        </div>
      </div>

      {localError && (
        <p role="alert" className="mt-3 text-sm text-confidence-low font-mono">
          {localError}
        </p>
      )}
    </div>
  )
}

function Corner({ className }) {
  return (
    <svg
      className={`absolute w-6 h-6 text-faint ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M1 8 V1 H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function UploadIcon({ active }) {
  return (
    <svg
      className={`w-10 h-10 ${active ? 'text-accent' : 'text-muted'}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 16V4M12 4L7 9M12 4l5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
