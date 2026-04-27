import { useSession } from '../context/SessionContext'
import { useStreamingChat } from '../hooks/useStreamingChat'

const TYPE_STYLES = {
  ANSWER: { bg: 'bg-green-900/60', border: 'border-green-700', badge: 'bg-green-700 text-green-100' },
  QUESTION_TO_ASK: { bg: 'bg-blue-900/60', border: 'border-blue-700', badge: 'bg-blue-700 text-blue-100' },
  FACT_CHECK: { bg: 'bg-amber-900/60', border: 'border-amber-700', badge: 'bg-amber-700 text-amber-100' },
  TALKING_POINT: { bg: 'bg-purple-900/60', border: 'border-purple-700', badge: 'bg-purple-700 text-purple-100' },
  CLARIFICATION: { bg: 'bg-cyan-900/60', border: 'border-cyan-700', badge: 'bg-cyan-700 text-cyan-100' },
}

const TYPE_LABELS = {
  ANSWER: 'ANSWER',
  QUESTION_TO_ASK: 'QUESTION',
  FACT_CHECK: 'FACT-CHECK',
  TALKING_POINT: 'TALKING POINT',
  CLARIFICATION: 'CLARIFICATION',
}

function transcriptWindow(transcript, windowSecs) {
  const nowMs = Date.now() % 86400000
  const windowMs = windowSecs * 1000
  const chunks = transcript.filter((chunk) => {
    const [h, m, s] = chunk.timestamp.split(':').map(Number)
    const chunkMs = (h * 3600 + m * 60 + s) * 1000
    return nowMs - chunkMs < windowMs
  })
  const selected = chunks.length > 0 ? chunks : transcript
  return selected.map((chunk) => `[${chunk.timestamp}] ${chunk.text}`).join('\n')
}

export default function SuggestionCard({ suggestion }) {
  const { state } = useSession()
  const { sendMessage } = useStreamingChat()
  const styles = TYPE_STYLES[suggestion.type] || TYPE_STYLES['TALKING_POINT']

  function handleClick() {
    const msg = `${suggestion.detail_prompt}\n\n[Context: "${suggestion.preview}"]`
    sendMessage(msg, {
      systemPrompt: state.settings.detailPrompt,
      transcript: transcriptWindow(state.transcript, state.settings.detailContextWindowSecs),
    })
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-lg border ${styles.bg} ${styles.border} hover:brightness-125 transition-all cursor-pointer`}
    >
      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-2 ${styles.badge}`}>
        {TYPE_LABELS[suggestion.type] || suggestion.type}
      </span>
      <p className="text-sm text-slate-200 leading-relaxed">{suggestion.preview}</p>
    </button>
  )
}
