import { useCallback, useRef } from 'react'

export function useMicRecorder({ onChunk }) {
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const headerBlobRef = useRef(null)
  const chunkCountRef = useRef(0)
  const flushResolversRef = useRef([])

  const resolveFlushes = useCallback(() => {
    const resolvers = flushResolversRef.current
    flushResolversRef.current = []
    resolvers.forEach((resolve) => resolve())
  }, [])

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder
    chunkCountRef.current = 0
    headerBlobRef.current = null

    recorder.ondataavailable = async (e) => {
      if (!e.data || e.data.size === 0) {
        resolveFlushes()
        return
      }

      chunkCountRef.current++
      if (chunkCountRef.current === 1) {
        headerBlobRef.current = e.data
        await onChunk(e.data)
      } else {
        const combined = new Blob([headerBlobRef.current, e.data], { type: mimeType })
        await onChunk(combined)
      }
      resolveFlushes()
    }

    recorder.start(30000)
  }, [onChunk, resolveFlushes])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    mediaRecorderRef.current = null
    streamRef.current = null
    resolveFlushes()
  }, [resolveFlushes])

  const flush = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') return Promise.resolve()

    return new Promise((resolve) => {
      flushResolversRef.current.push(resolve)
      recorder.requestData()
    })
  }, [])

  return { start, stop, flush }
}
