/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useReducer } from 'react'
import { DEFAULT_CHAT_PROMPT, DEFAULT_DETAIL_PROMPT, DEFAULT_SUGGESTION_PROMPT } from '../prompts'

const initialState = {
  transcript: [],
  suggestionBatches: [],
  chatHistory: [],
  isRecording: false,
  isLoadingSuggestions: false,
  isStreamingChat: false,
  groqApiKey: '',
  showSettings: false,
  micError: null,
  settings: {
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    detailPrompt: DEFAULT_DETAIL_PROMPT,
    contextWindowSecs: 90,
    refreshIntervalSecs: 30,
  },
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_RECORDING':
      return { ...state, isRecording: action.payload, micError: null }
    case 'ADD_TRANSCRIPT_CHUNK':
      return { ...state, transcript: [...state.transcript, action.payload] }
    case 'ADD_SUGGESTION_BATCH':
      return {
        ...state,
        suggestionBatches: [action.payload, ...state.suggestionBatches],
        isLoadingSuggestions: false,
      }
    case 'SET_LOADING_SUGGESTIONS':
      return { ...state, isLoadingSuggestions: action.payload }
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] }
    case 'UPDATE_LAST_CHAT_MESSAGE':
      return {
        ...state,
        chatHistory: state.chatHistory.map((m, i) =>
          i === state.chatHistory.length - 1 ? { ...m, content: m.content + action.payload } : m
        ),
      }
    case 'SET_STREAMING_CHAT':
      return { ...state, isStreamingChat: action.payload }
    case 'SET_API_KEY':
      return { ...state, groqApiKey: action.payload }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings }
    case 'SET_MIC_ERROR':
      return { ...state, micError: action.payload }
    default:
      return state
  }
}

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const key = localStorage.getItem('groq_api_key') || ''
    if (key) dispatch({ type: 'SET_API_KEY', payload: key })
    else dispatch({ type: 'TOGGLE_SETTINGS' })
  }, [])

  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
