import { useState, useEffect, useRef } from 'react'
import { useSession } from '../context/SessionContext'
import { useStreamingChat } from '../hooks/useStreamingChat'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? 'bg-blue-600 text-white' : 'bg-[#1a2535] text-slate-200'
      }`}>
        {msg.content || <span className="opacity-40 animate-pulse">▋</span>}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const { state } = useSession()
  const { sendMessage } = useStreamingChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.chatHistory])

  function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || state.isStreamingChat) return
    setInput('')
    sendMessage(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5f]">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Chat</h2>
        {state.isStreamingChat && (
          <span className="text-xs text-blue-400 animate-pulse">Responding...</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {state.chatHistory.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-500">
            Click a suggestion card or type a question
          </div>
        )}
        {state.chatHistory.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-[#1e3a5f]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the meeting..."
            rows={2}
            className="flex-1 bg-[#0f1923] border border-[#2d3f55] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || state.isStreamingChat}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors self-end"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1">Enter to send · Shift+Enter for newline</p>
      </form>
    </div>
  )
}
