# TwinMind Live Suggestions

An always-on AI meeting copilot that listens to live audio and continuously surfaces three contextually-aware suggestion cards.

## 1. Setup

```bash
# Terminal 1 — frontend
cd client
npm install
npm run dev          # → http://localhost:5173

# Terminal 2 — backend
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:5173, click the settings gear, paste your Groq API key, and hit Save.

## 2. Environment

Only one env var is needed client-side:

```
VITE_API_URL=http://localhost:8000   # default — only change for production
```

No server-side env vars are required. The Groq API key is entered by the user in the Settings modal and stored in `localStorage`. The backend reads it per-request from the `X-Groq-Api-Key` header and never persists it.

## 2.1 Testing

```bash
cd server
pip install -r requirements.txt -r requirements-dev.txt
pytest

cd ../client
npm ci
npm run lint
npm run build
```

## 2.2 Deployment

This repo includes `vercel.json` and `api/index.py` so Vercel can build the React app from `client/` and route `/api/*` requests to the FastAPI app as a Python serverless function.

To deploy automatically:
1. Push the project to GitHub.
2. Import the GitHub repo in Vercel.
3. Use the repository defaults from `vercel.json`.

Vercel will deploy on pushes after the Git integration is connected. GitHub Actions in `.github/workflows/ci.yml` runs backend tests plus frontend lint/build on pushes and pull requests.

## 3. Stack Choices

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite | Fast HMR; component model maps cleanly to the 3-column layout |
| Styling | Tailwind CSS | Dark theme utilities; no custom CSS files needed |
| State | React Context + useReducer | Session-only state; Redux would be overkill |
| Audio capture | MediaRecorder API | Browser-native 30s timeslice chunks; no third-party dep |
| STT | Groq Whisper Large V3 | Mandated; fast and accurate |
| LLM | `llama-3.3-70b-versatile` | Mandated; GPT-OSS 120B equivalent |
| Backend | Python FastAPI + httpx | Async, lightweight; native SSE streaming support |

## 4. Prompt Strategy

Three prompts drive the system:

**Live Suggestions** (`/api/suggestions`, every 30s): The system prompt enforces a 5-type taxonomy — `ANSWER`, `QUESTION_TO_ASK`, `FACT_CHECK`, `TALKING_POINT`, `CLARIFICATION` — and requires varied types per batch. Crucially, previews must deliver *standalone value*: a real fact, a real answer, or a real question with reasoning. The model is forbidden from writing teaser copy like "click to learn more."

**Detailed Answer** (on card click): Expands the card's `detail_prompt` field using the full transcript as context. Targets 150–300 words, uses bullets and bold for scannability.

**Chat** (free-text): Maintains full conversation history per session. The full transcript is injected into the system prompt so every response is grounded in what was actually said.

## 5. Context Windowing

Every suggestion call sends:
- `recent_transcript` — last 90 seconds of transcribed text (primary signal)
- `session_summary` — a 2–3 sentence rolling summary updated every 5 minutes (not every call)

Sending the full transcript on every 30s suggestion call would be expensive and slow. The 90s window captures what the conversation is about *right now*, while the rolling summary preserves meeting-wide context without paying for the full token count on every call.

## 6. Tradeoffs

- **No mobile layout** — the 3-column design targets laptop/desktop; responsive CSS would require a complete layout redesign for small screens.
- **No persistence across page reloads** — all state lives in React. Session export (JSON download) is the escape hatch.
- **No multi-speaker diarization** — Whisper transcribes audio but doesn't label speakers. Adding speaker labels would require a diarization step.
- **API key in localStorage** — convenient for a single-user tool; not suitable for a shared/multi-tenant deployment where a server-side secrets store would be needed.

## 7. Known Limitations

- **WebM codec header prepend** — MediaRecorder timeslice chunks after the first do not contain the codec header. Each subsequent chunk is prepended with the first chunk (which does contain the header) before being sent to Whisper, so it can parse the audio independently. Without this, Whisper returns garbled or empty transcriptions for all but the first chunk.
- **30s timeslice latency floor** — The minimum end-to-end latency is ~30s (the timeslice duration) plus Whisper inference time. Sub-30s suggestions are not possible with the current chunking strategy.
- **CORS origins** — The backend allows `localhost:5173` and `localhost:4173` by default. For production, update `allow_origins` in `server/main.py` to your Vercel deployment URL.
