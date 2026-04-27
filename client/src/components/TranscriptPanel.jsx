import { useEffect, useRef, useCallback } from 'react'
import { useSession } from '../context/SessionContext'
import { useMicRecorder } from '../hooks/useMicRecorder'
import { transcribeAudio } from '../api/groq'

export default function TranscriptPanel() {
  const { state, dispatch } = useSession()
  const bottomRef = useRef(null)

  const handleChunk = useCallback(async (blob) => {
    if (!state.groqApiKey) return
    try {
      const { text } = await transcribeAudio(blob, state.groqApiKey)
      if (!text?.trim()) return
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
      dispatch({ type: 'ADD_TRANSCRIPT_CHUNK', payload: { timestamp, text: text.trim() } })
    } catch (err) {
      if (err.status === 401) {
        dispatch({ type: 'SET_MIC_ERROR', payload: 'Invalid Groq API key. Check Settings.' })
        dispatch({ type: 'TOGGLE_SETTINGS' })
      } else {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
        dispatch({ type: 'ADD_TRANSCRIPT_CHUNK', payload: { timestamp, text: '[transcription error]' } })
      }
    }
  }, [state.groqApiKey, dispatch])

  const { start, stop } = useMicRecorder({ onChunk: handleChunk })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.transcript])

  async function toggleRecording() {
    if (state.isRecording) {
      stop()
      dispatch({ type: 'SET_RECORDING', payload: false })
    } else {
      if (!state.groqApiKey) {
        dispatch({ type: 'TOGGLE_SETTINGS' })
        return
      }
      try {
        await start()
        dispatch({ type: 'SET_RECORDING', payload: true })
      } catch {
        dispatch({ type: 'SET_MIC_ERROR', payload: 'Microphone access denied. Please allow mic access in your browser settings.' })
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Transcript</h2>
        {state.isRecording && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        <button
          onClick={toggleRecording}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${
            state.isRecording
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {state.isRecording ? (
            <>
              <span className="w-3 h-3 rounded-sm bg-white" />
              Stop Recording
            </>
          ) : (
            <>
              <span className="w-3 h-3 rounded-full bg-white" />
              Start Recording
            </>
          )}
        </button>

        {!state.isRecording && state.transcript.length === 0 && (
          <p className="text-xs text-slate-500 text-center mt-2">IDLE — click to begin</p>
        )}
      </div>

      {state.micError && (
        <div className="mx-4 mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-xs text-red-300">
          {state.micError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {state.transcript.map((chunk, i) => (
          <div key={i} className="text-sm">
            <span className="text-xs text-blue-400 font-mono mr-2">{chunk.timestamp}</span>
            <span className="text-slate-300">{chunk.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
