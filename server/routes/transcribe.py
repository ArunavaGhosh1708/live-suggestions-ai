from fastapi import APIRouter, UploadFile, File, Header, HTTPException
import httpx
from prompts import GROQ_WHISPER_URL, GROQ_WHISPER_MODEL

router = APIRouter()

@router.post('/transcribe')
async def transcribe(audio: UploadFile = File(...), x_groq_api_key: str = Header(...)):
    content = await audio.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='Audio chunk too large (> 25MB)')

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GROQ_WHISPER_URL,
            headers={'Authorization': f'Bearer {x_groq_api_key}'},
            files={'file': ('audio.webm', content, 'audio/webm')},
            data={'model': GROQ_WHISPER_MODEL, 'response_format': 'json'},
        )

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail='Invalid Groq API key')
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail='Groq rate limit exceeded')
    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f'Groq error: {resp.text[:200]}')

    return {'text': resp.json().get('text', '')}
