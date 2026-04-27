const API_BASE = import.meta.env.VITE_API_URL || ''

export async function transcribeAudio(blob, apiKey) {
  const formData = new FormData()
  formData.append('audio', blob, 'chunk.webm')
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'X-Groq-Api-Key': apiKey },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.detail || err.error || 'Transcription failed'), { status: res.status })
  }
  return res.json()
}

export async function fetchSuggestions({ recentTranscript, sessionSummary, fullTranscript, apiKey, prompt }) {
  const res = await fetch(`${API_BASE}/api/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Groq-Api-Key': apiKey },
    body: JSON.stringify({
      recent_transcript: recentTranscript,
      session_summary: sessionSummary,
      full_transcript: fullTranscript,
      prompt,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.detail || err.error || 'Suggestion fetch failed'), { status: res.status })
  }
  return res.json()
}

export async function summarizeTranscript({ transcript, apiKey }) {
  const res = await fetch(`${API_BASE}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Groq-Api-Key': apiKey },
    body: JSON.stringify({ transcript }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.detail || err.error || 'Summary failed'), { status: res.status })
  }
  return res.json()
}

export async function* streamChat({ message, transcript, history, apiKey, systemPrompt }) {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Groq-Api-Key': apiKey },
    body: JSON.stringify({ message, transcript, history, system_prompt: systemPrompt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.detail || err.error || 'Chat stream failed'), { status: res.status })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const token = parsed.choices?.[0]?.delta?.content
        if (token) yield token
      } catch {
        // Ignore malformed keepalive or partial SSE frames.
      }
    }
  }
}
