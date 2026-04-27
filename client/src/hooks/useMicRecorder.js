import { useRef, useCallback } from 'react'

export function useMicRecorder({ onChunk }) {
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const headerBlobRef = useRef(null)
  const chunkCountRef = useRef(0)

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(stream, { mimeType, timeslice: 30000 })
    mediaRecorderRef.current = recorder
    chunkCountRef.current = 0
    headerBlobRef.current = null

    recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return
      chunkCountRef.current++

      if (chunkCountRef.current === 1) {
        // First chunk contains the codec header — save it and send as-is
        headerBlobRef.current = e.data
        onChunk(e.data)
      } else {
        // Subsequent chunks need the header prepended so Whisper can parse them
        const combined = new Blob([headerBlobRef.current, e.data], { type: mimeType })
        onChunk(combined)
      }
    }

    recorder.start(30000)
  }, [onChunk])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    mediaRecorderRef.current = null
    streamRef.current = null
  }, [])

  return { start, stop }
}
