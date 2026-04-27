import { useSession, SessionProvider } from './context/SessionContext'
import TranscriptPanel from './components/TranscriptPanel'
import SuggestionsPanel from './components/SuggestionsPanel'
import ChatPanel from './components/ChatPanel'
import SettingsModal from './components/SettingsModal'

function exportSession(state) {
  const start = state.transcript[0]?.timestamp || '00:00:00'
  const end = state.transcript[state.transcript.length - 1]?.timestamp || '00:00:00'
  const [sh, sm, ss] = start.split(':').map(Number)
  const [eh, em, es] = end.split(':').map(Number)
  const durationSecs = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss)

  const data = {
    exported_at: new Date().toISOString(),
    session_duration_seconds: Math.max(0, durationSecs),
    transcript: state.transcript,
    suggestion_batches: state.suggestionBatches,
    chat_history: state.chatHistory,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function AppInner() {
  const { state, dispatch } = useSession()

  return (
    <div className="flex flex-col h-screen bg-[#0F1923] text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1e3a5f] bg-[#0d1720] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-semibold text-white">TwinMind Live Suggestions</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportSession(state)}
            disabled={state.transcript.length === 0 && state.suggestionBatches.length === 0}
            className="text-xs px-3 py-1.5 bg-[#1a2535] hover:bg-[#243350] disabled:opacity-40 disabled:cursor-not-allowed border border-[#2d3f55] text-slate-300 rounded-lg transition-colors"
          >
            Export Session
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 divide-x divide-[#1e3a5f]">
        <div className="w-1/3 flex flex-col min-h-0 overflow-hidden">
          <TranscriptPanel />
        </div>
        <div className="w-1/3 flex flex-col min-h-0 overflow-hidden">
          <SuggestionsPanel />
        </div>
        <div className="w-1/3 flex flex-col min-h-0 overflow-hidden">
          <ChatPanel />
        </div>
      </div>

      {state.showSettings && <SettingsModal />}
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppInner />
    </SessionProvider>
  )
}
