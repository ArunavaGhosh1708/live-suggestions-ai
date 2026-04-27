# TwinMind Live Suggestions

An always-on AI meeting copilot that listens to live microphone audio, appends transcript chunks, and continuously surfaces three useful live suggestions. Clicking a suggestion sends it to the chat panel and returns a longer answer grounded in meeting context.

## Setup

Run the backend and frontend in separate terminals.

```bash
# Terminal 1: backend
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
# Terminal 2: frontend
cd client
npm install
npm run dev
```

Open `http://localhost:5173`, click the settings button, paste a Groq API key, and save.

## Environment

For local development, create `client/.env.local` if you want to override the API URL:

```env
VITE_API_URL=http://localhost:8000
```

No server-side Groq key is required. The user enters their own Groq API key in the Settings modal. The key is stored in browser `localStorage` as `groq_api_key` and sent to the backend on each request as the `X-Groq-Api-Key` header. The backend never persists it.

## Stack Choices

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 19 + Vite | Fast local workflow and a simple component model for the required 3-column UI. |
| Styling | Tailwind CSS | Compact dark-theme styling without extra component dependencies. |
| State | React Context + `useReducer` | Session-only state fits a reducer well; Redux would be unnecessary. |
| Audio capture | Browser `MediaRecorder` | Native mic capture with 30 second chunks and manual `requestData()` flush support. |
| Transcription | Groq `whisper-large-v3` | Assignment-required Whisper Large V3 model. |
| Suggestions/chat | Groq `openai/gpt-oss-120b` | Assignment-required GPT-OSS 120B model on Groq. |
| Backend | FastAPI + httpx | Lightweight async proxy for Groq transcription, JSON suggestions, summary calls, and streaming chat. |
| Hosting | Vercel | Static Vite build plus Python serverless FastAPI entrypoint in `api/index.py`. |

## App Flow

The UI follows the assignment prototype:

- Left column: start/stop mic control and streaming transcript chunks.
- Middle column: live suggestion batches, newest first, with a manual reload button.
- Right column: one continuous chat session.
- Header: export button for transcript, suggestion batches, and chat history.

Audio is recorded in roughly 30 second WebM/Opus chunks. Manual reload asks `MediaRecorder` to flush the in-progress chunk first, waits for transcription, then requests suggestions.

## Prompt Strategy

The system uses separate prompts for the three different jobs.

**Live suggestions:** `/api/suggestions` requests exactly three JSON cards. The default prompt requires the model to choose from `ANSWER`, `QUESTION_TO_ASK`, `FACT_CHECK`, `TALKING_POINT`, and `CLARIFICATION`, vary the mix, and make every preview useful on its own. The prompt explicitly rejects teaser text like "click to learn more" because evaluators judge the card before it is opened.

**Detailed answer on click:** Each suggestion includes a `detail_prompt`. Clicking the card sends that prompt plus the card preview into the chat flow with a separate detailed-answer system prompt. This prompt asks for concise but substantive answers, grounded in the transcript, with bullets and bold terms where useful.

**Free chat:** User-entered questions use the chat prompt and preserve the full chat history for continuity. The transcript is injected as context so answers stay tied to what was actually said in the meeting.

All three prompts are editable in Settings so prompt iterations can be tested without code changes.

## Context Strategy

Live suggestions optimize for "what is useful right now":

- `recent_transcript`: default last 90 seconds, primary signal for suggestions.
- `session_summary`: rolling 2-3 sentence summary refreshed every 5 minutes.
- `full_transcript`: only sent as a fallback before a rolling summary exists.

Detailed answers use a separate expanded-answer context window. The default is 900 seconds, which gives enough context for a useful answer without sending an entire long meeting on every card click.

Free chat uses the current transcript context plus the chat history, because user questions may refer to earlier parts of the meeting.

## API Routes

Backend routes are exposed under `/api`:

- `GET /api/health`
- `POST /api/transcribe`
- `POST /api/suggestions`
- `POST /api/summary`
- `POST /api/chat/stream`

`api/index.py` is the Vercel entrypoint. It imports the FastAPI app from `server/main.py` and also serves the built React app if Vercel routes `/` into the Python function.

## Testing

Backend tests mock Groq calls and cover route behavior, malformed JSON retry, summaries, streaming chat message construction, and transcription error mapping.

```bash
cd server
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

Frontend lint:

```bash
cd client
npm ci
npm run lint
```

Production build:

```bash
cd client
npm run build
```

GitHub Actions runs backend tests, frontend lint, and frontend build on pushes and pull requests.

## Deployment

The repo includes:

- `vercel.json` for Vercel build and rewrites.
- `api/index.py` for the Python serverless entrypoint.
- root `requirements.txt` for Vercel Python dependencies.
- `.python-version` for Python 3.12.

Deploy flow:

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Let Vercel use the checked-in `vercel.json`.

Expected checks after deploy:

```text
/            -> React app
/api/health  -> {"status":"ok"}
```

## Tradeoffs

- **Desktop-first layout:** The assignment prototype is a 3-column desktop meeting UI. The app keeps that layout instead of spending complexity on a mobile redesign.
- **No login or persistence:** State is session-only in React. Reloading clears transcript and chat. Export provides the evaluation artifact.
- **API key in localStorage:** This is convenient for a single-user assignment app and avoids shipping a key. A multi-tenant product should use server-side secret storage or delegated auth.
- **No speaker diarization:** Whisper provides transcript text but not speaker labels. Diarization would add latency and another model/service.
- **30 second baseline latency:** Timed transcript chunks use 30 second slices. Manual reload can flush the current chunk, but automatic suggestions still follow the chunk cadence.
- **JSON parsing retry:** Suggestions are requested as JSON. If the model returns malformed JSON, the backend retries once at temperature 0 before returning a 422.
- **Rolling summary over full transcript:** Sending the full transcript every 30 seconds would be slower and more expensive. Recent transcript plus rolling summary is a better fit for live suggestions.
