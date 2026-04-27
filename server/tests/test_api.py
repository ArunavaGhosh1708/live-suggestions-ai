import json

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health():
    response = client.get('/api/health')

    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_suggestions_retries_malformed_json(monkeypatch):
    import routes.suggestions as suggestions_route

    calls = []

    async def fake_call_llm(messages, api_key, temperature=0.7):
        calls.append({'messages': messages, 'api_key': api_key, 'temperature': temperature})
        if len(calls) == 1:
            return 'not-json'
        return json.dumps([
            {'type': 'ANSWER', 'preview': 'Use FastAPI.', 'detail_prompt': 'Explain FastAPI.'},
            {'type': 'QUESTION_TO_ASK', 'preview': 'Ask about latency.', 'detail_prompt': 'Expand.'},
            {'type': 'FACT_CHECK', 'preview': 'Whisper transcribes audio.', 'detail_prompt': 'Expand.'},
            {'type': 'TALKING_POINT', 'preview': 'Discuss deployment.', 'detail_prompt': 'Expand.'},
        ])

    monkeypatch.setattr(suggestions_route, 'call_llm', fake_call_llm)

    response = client.post(
        '/api/suggestions',
        headers={'X-Groq-Api-Key': 'test-key'},
        json={
            'recent_transcript': 'We need a FastAPI backend.',
            'full_transcript': 'Earlier context. We need a FastAPI backend.',
        },
    )

    assert response.status_code == 200
    assert len(response.json()['suggestions']) == 3
    assert calls[0]['temperature'] == 0.7
    assert calls[1]['temperature'] == 0
    assert 'Full transcript context' in calls[0]['messages'][1]['content']


def test_suggestions_rejects_non_array(monkeypatch):
    import routes.suggestions as suggestions_route

    async def fake_call_llm(messages, api_key, temperature=0.7):
        return json.dumps({'type': 'ANSWER'})

    monkeypatch.setattr(suggestions_route, 'call_llm', fake_call_llm)

    response = client.post(
        '/api/suggestions',
        headers={'X-Groq-Api-Key': 'test-key'},
        json={'recent_transcript': 'Discussing roadmap.'},
    )

    assert response.status_code == 422
    assert response.json()['detail'] == 'Expected a JSON array of suggestions'


def test_summary_returns_llm_summary(monkeypatch):
    import routes.suggestions as suggestions_route

    captured = {}

    async def fake_call_llm(messages, api_key, temperature=0.7):
        captured['messages'] = messages
        captured['api_key'] = api_key
        captured['temperature'] = temperature
        return 'Team chose FastAPI and Vercel. Open question: latency budget.'

    monkeypatch.setattr(suggestions_route, 'call_llm', fake_call_llm)

    response = client.post(
        '/api/summary',
        headers={'X-Groq-Api-Key': 'test-key'},
        json={'transcript': 'Long meeting transcript'},
    )

    assert response.status_code == 200
    assert response.json()['summary'] == 'Team chose FastAPI and Vercel. Open question: latency budget.'
    assert captured['temperature'] == 0.2
    assert captured['messages'][0]['role'] == 'system'


def test_chat_stream_builds_messages(monkeypatch):
    import routes.chat as chat_route

    captured = {}

    async def fake_token_stream(messages, api_key):
        captured['messages'] = messages
        captured['api_key'] = api_key
        yield 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'

    monkeypatch.setattr(chat_route, 'token_stream', fake_token_stream)

    response = client.post(
        '/api/chat/stream',
        headers={'X-Groq-Api-Key': 'test-key'},
        json={
            'message': 'What did we decide?',
            'transcript': '[10:00:00] Use FastAPI.',
            'history': [{'role': 'assistant', 'content': 'Earlier answer'}],
            'system_prompt': 'Custom system',
        },
    )

    assert response.status_code == 200
    assert 'ok' in response.text
    assert captured['api_key'] == 'test-key'
    assert captured['messages'][0]['content'].startswith('Custom system')
    assert 'Full meeting transcript' in captured['messages'][0]['content']
    assert captured['messages'][-1] == {'role': 'user', 'content': 'What did we decide?'}


class FakeGroqResponse:
    def __init__(self, status_code, payload=None, text=''):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text
        self.is_success = 200 <= status_code < 300

    def json(self):
        return self._payload


class FakeAsyncClient:
    response = FakeGroqResponse(200, {'text': 'hello world'})

    def __init__(self, timeout):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        return self.response


def test_transcribe_success(monkeypatch):
    import routes.transcribe as transcribe_route

    FakeAsyncClient.response = FakeGroqResponse(200, {'text': 'hello world'})
    monkeypatch.setattr(transcribe_route.httpx, 'AsyncClient', FakeAsyncClient)

    response = client.post(
        '/api/transcribe',
        headers={'X-Groq-Api-Key': 'test-key'},
        files={'audio': ('chunk.webm', b'audio', 'audio/webm')},
    )

    assert response.status_code == 200
    assert response.json() == {'text': 'hello world'}


def test_transcribe_maps_groq_auth_error(monkeypatch):
    import routes.transcribe as transcribe_route

    FakeAsyncClient.response = FakeGroqResponse(401, text='bad key')
    monkeypatch.setattr(transcribe_route.httpx, 'AsyncClient', FakeAsyncClient)

    response = client.post(
        '/api/transcribe',
        headers={'X-Groq-Api-Key': 'test-key'},
        files={'audio': ('chunk.webm', b'audio', 'audio/webm')},
    )

    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid Groq API key'
