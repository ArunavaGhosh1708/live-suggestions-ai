import { useCallback } from 'react'
import { useSession } from '../context/SessionContext'
import { streamChat } from '../api/groq'

export function useStreamingChat() {
  const { state, dispatch } = useSession()

  const sendMessage = useCallback(async (messageText, options = {}) => {
    if (!state.groqApiKey) {
      dispatch({ type: 'TOGGLE_SETTINGS' })
      return
    }

    const userMsg = { role: 'user', content: messageText, timestamp: new Date().toLocaleTimeString() }
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg })

    const assistantMsg = { role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString() }
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: assistantMsg })
    dispatch({ type: 'SET_STREAMING_CHAT', payload: true })

    const transcript = options.transcript ?? state.transcript.map((c) => `[${c.timestamp}] ${c.text}`).join('\n')
    const history = state.chatHistory.map(({ role, content }) => ({ role, content }))

    try {
      const stream = streamChat({
        message: messageText,
        transcript,
        history,
        apiKey: state.groqApiKey,
        systemPrompt: options.systemPrompt || state.settings.chatPrompt,
      })
      for await (const token of stream) {
        dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: token })
      }
    } catch (err) {
      dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: `\n\n[Error: ${err.message}]` })
    } finally {
      dispatch({ type: 'SET_STREAMING_CHAT', payload: false })
    }
  }, [state.groqApiKey, state.transcript, state.chatHistory, state.settings.chatPrompt, dispatch])

  return { sendMessage }
}
