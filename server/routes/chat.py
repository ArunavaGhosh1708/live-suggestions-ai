from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
import httpx
from models import ChatRequest
from prompts import GROQ_API_URL, GROQ_MODEL, DEFAULT_CHAT_PROMPT

router = APIRouter()

async def token_stream(messages, api_key):
    payload = {
        'model': GROQ_MODEL,
        'messages': messages,
        'stream': True,
        'temperature': 0.7,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream(
            'POST', GROQ_API_URL,
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json=payload,
        ) as resp:
            if resp.status_code == 401:
                yield 'data: {"error": "Invalid Groq API key"}\n\n'
                return
            if resp.status_code == 429:
                yield 'data: {"error": "Rate limited"}\n\n'
                return
            async for line in resp.aiter_lines():
                if line.startswith('data:'):
                    yield f'{line}\n\n'

@router.post('/chat/stream')
async def chat_stream(req: ChatRequest, x_groq_api_key: str = Header(...)):
    system_prompt = req.system_prompt or DEFAULT_CHAT_PROMPT
    if req.transcript:
        system_prompt += f'\n\nFull meeting transcript:\n{req.transcript}'

    messages = [{'role': 'system', 'content': system_prompt}]
    for msg in (req.history or []):
        messages.append({'role': msg.role, 'content': msg.content})
    messages.append({'role': 'user', 'content': req.message})

    return StreamingResponse(
        token_stream(messages, x_groq_api_key),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
