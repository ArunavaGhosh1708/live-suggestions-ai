import json
from fastapi import APIRouter, Header, HTTPException
import httpx
from models import SuggestionsRequest, SummaryRequest
from prompts import GROQ_API_URL, GROQ_MODEL, DEFAULT_SUGGESTION_PROMPT, ROLLING_SUMMARY_PROMPT

router = APIRouter()

async def call_llm(messages, api_key, temperature=0.7):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={'model': GROQ_MODEL, 'messages': messages, 'temperature': temperature},
        )
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail='Invalid Groq API key')
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail='Groq rate limit exceeded')
    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f'Groq error: {resp.text[:200]}')
    return resp.json()['choices'][0]['message']['content']

def parse_suggestions(raw: str):
    raw = raw.strip()
    # Strip markdown fences if model adds them despite instructions
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[-1]
        raw = raw.rsplit('```', 1)[0]
    return json.loads(raw)

def compact_context(text: str, max_chars: int = 6000):
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]

@router.post('/suggestions')
async def get_suggestions(req: SuggestionsRequest, x_groq_api_key: str = Header(...)):
    system_prompt = req.prompt or DEFAULT_SUGGESTION_PROMPT

    user_content = f"Recent transcript (last 90 seconds):\n{req.recent_transcript}"
    if req.session_summary:
        user_content += f"\n\nSession context (full meeting summary):\n{req.session_summary}"
    elif req.full_transcript and req.full_transcript.strip() != req.recent_transcript.strip():
        user_content += "\n\nFull transcript context (truncated fallback until a rolling summary exists):\n"
        user_content += compact_context(req.full_transcript)

    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_content},
    ]

    raw = await call_llm(messages, x_groq_api_key)
    try:
        suggestions = parse_suggestions(raw)
    except (json.JSONDecodeError, ValueError):
        # Retry once at temperature 0
        raw = await call_llm(messages, x_groq_api_key, temperature=0)
        try:
            suggestions = parse_suggestions(raw)
        except Exception:
            raise HTTPException(status_code=422, detail='Model returned malformed JSON')

    if not isinstance(suggestions, list):
        raise HTTPException(status_code=422, detail='Expected a JSON array of suggestions')

    return {'suggestions': suggestions[:3]}

@router.post('/summary')
async def summarize(req: SummaryRequest, x_groq_api_key: str = Header(...)):
    if not req.transcript.strip():
        return {'summary': ''}

    messages = [
        {'role': 'system', 'content': ROLLING_SUMMARY_PROMPT},
        {'role': 'user', 'content': compact_context(req.transcript, max_chars=12000)},
    ]
    summary = await call_llm(messages, x_groq_api_key, temperature=0.2)
    return {'summary': summary.strip()}
