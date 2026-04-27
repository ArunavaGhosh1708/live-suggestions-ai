import { useState } from 'react'
import { useSession } from '../context/SessionContext'

export default function SettingsModal() {
  const { state, dispatch } = useSession()
  const [apiKey, setApiKey] = useState(state.groqApiKey)
  const [suggestionPrompt, setSuggestionPrompt] = useState(state.settings.suggestionPrompt)
  const [chatPrompt, setChatPrompt] = useState(state.settings.chatPrompt)
  const [detailPrompt, setDetailPrompt] = useState(state.settings.detailPrompt)
  const [contextWindowSecs, setContextWindowSecs] = useState(state.settings.contextWindowSecs)
  const [refreshIntervalSecs, setRefreshIntervalSecs] = useState(state.settings.refreshIntervalSecs)

  function save() {
    localStorage.setItem('groq_api_key', apiKey)
    dispatch({ type: 'SET_API_KEY', payload: apiKey })
    dispatch({
      type: 'SET_SETTINGS',
      payload: { suggestionPrompt, chatPrompt, detailPrompt, contextWindowSecs: Number(contextWindowSecs), refreshIntervalSecs: Number(refreshIntervalSecs) },
    })
    dispatch({ type: 'TOGGLE_SETTINGS' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#1a2535] border border-[#2d3f55] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          {state.groqApiKey && (
            <button onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Groq API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">Stored in localStorage only — never sent to our servers.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Live Suggestion Prompt</label>
            <textarea
              value={suggestionPrompt}
              onChange={(e) => setSuggestionPrompt(e.target.value)}
              rows={6}
              className="w-full bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Detailed Answer Prompt (on card click)</label>
            <textarea
              value={detailPrompt}
              onChange={(e) => setDetailPrompt(e.target.value)}
              rows={4}
              className="w-full bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Chat Prompt</label>
            <textarea
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              rows={4}
              className="w-full bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Context Window (seconds)</label>
              <input
                type="number"
                value={contextWindowSecs}
                onChange={(e) => setContextWindowSecs(e.target.value)}
                min={30}
                max={300}
                className="w-full bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Refresh Interval (seconds)</label>
              <input
                type="number"
                value={refreshIntervalSecs}
                onChange={(e) => setRefreshIntervalSecs(e.target.value)}
                min={10}
                max={120}
                className="w-full bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={!apiKey.trim()}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
