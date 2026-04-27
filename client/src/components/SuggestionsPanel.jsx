import { useState, useCallback, useRef } from 'react'
import { useSession } from '../context/SessionContext'
import { useSuggestionTimer } from '../hooks/useSuggestionTimer'
import { fetchSuggestions, summarizeTranscript } from '../api/groq'
import SuggestionCard from './SuggestionCard'

const SUMMARY_INTERVAL_MS = 5 * 60 * 1000

function requestTranscriptFlush() {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('twinmind:flush-transcript', { detail: { resolve } }))
    setTimeout(resolve, 8000)
  })
}

export default function SuggestionsPanel() {
  const { state, dispatch } = useSession()
  const [error, setError] = useState(null)
  const [reloadCooldown, setReloadCooldown] = useState(false)
  const [sessionSummary, setSessionSummary] = useState('')
  const lastSummaryAtRef = useRef(0)

  const loadSuggestions = useCallback(async () => {
    if (!state.groqApiKey || state.transcript.length === 0) return
    setError(null)
    dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: true })

    const now = Date.now()
    const windowMs = state.settings.contextWindowSecs * 1000
    const recentChunks = state.transcript.filter((c) => {
      const [h, m, s] = c.timestamp.split(':').map(Number)
      const chunkMs = (h * 3600 + m * 60 + s) * 1000
      const nowMs = now % 86400000
      return nowMs - chunkMs < windowMs
    })
    const recentTranscript = recentChunks.map((c) => `[${c.timestamp}] ${c.text}`).join('\n')
    const fullTranscript = state.transcript.map((c) => `[${c.timestamp}] ${c.text}`).join('\n')

    try {
      let summaryForRequest = sessionSummary
      if (fullTranscript && now - lastSummaryAtRef.current >= SUMMARY_INTERVAL_MS) {
        const summaryData = await summarizeTranscript({
          transcript: fullTranscript,
          apiKey: state.groqApiKey,
        })
        summaryForRequest = summaryData.summary || ''
        setSessionSummary(summaryForRequest)
        lastSummaryAtRef.current = now
      }

      const data = await fetchSuggestions({
        recentTranscript: recentTranscript || fullTranscript,
        sessionSummary: summaryForRequest,
        fullTranscript: summaryForRequest ? '' : fullTranscript,
        apiKey: state.groqApiKey,
        prompt: state.settings.suggestionPrompt,
      })

      const batch = {
        batchNumber: state.suggestionBatches.length + 1,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        suggestions: data.suggestions,
      }
      dispatch({ type: 'ADD_SUGGESTION_BATCH', payload: batch })
    } catch (err) {
      dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: false })
      if (err.status === 401) {
        setError('Invalid API key.')
        dispatch({ type: 'TOGGLE_SETTINGS' })
      } else if (err.status === 429) {
        setError('Rate limited — wait a moment and retry.')
      } else {
        setError(err.message || 'Failed to load suggestions.')
      }
    }
  }, [state.groqApiKey, state.transcript, state.settings, state.suggestionBatches.length, sessionSummary, dispatch])

  useSuggestionTimer({
    intervalSecs: state.settings.refreshIntervalSecs,
    active: state.isRecording,
    onTick: loadSuggestions,
  })

  async function handleManualReload() {
    if (reloadCooldown) return
    setReloadCooldown(true)
    if (state.isRecording) await requestTranscriptFlush()
    await loadSuggestions()
    setTimeout(() => setReloadCooldown(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Live Suggestions</h2>
        <button
          onClick={handleManualReload}
          disabled={reloadCooldown || state.isLoadingSuggestions}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {state.isLoadingSuggestions ? 'Loading...' : reloadCooldown ? 'Reloaded' : 'Reload'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {state.isLoadingSuggestions && (
          <div className="text-center py-4 text-sm text-slate-400 animate-pulse">Generating suggestions...</div>
        )}

        {error && (
          <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-xs text-red-300 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={handleManualReload} className="ml-2 underline hover:no-underline">Retry</button>
          </div>
        )}

        {state.suggestionBatches.length === 0 && !state.isLoadingSuggestions && (
          <div className="text-center py-8 text-sm text-slate-500">
            {state.isRecording ? 'Suggestions will appear shortly...' : 'Start recording to get live suggestions'}
          </div>
        )}

        {state.suggestionBatches.map((batch, bi) => (
          <div key={bi}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-[#1e3a5f]" />
              <span className="text-xs text-slate-500 whitespace-nowrap">— BATCH {batch.batchNumber} · {batch.timestamp} —</span>
              <div className="flex-1 h-px bg-[#1e3a5f]" />
            </div>
            <div className="space-y-2">
              {batch.suggestions.map((s, si) => (
                <SuggestionCard key={si} suggestion={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
