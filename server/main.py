from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import transcribe, suggestions, chat

app = FastAPI(title='TwinMind API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:4173'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(transcribe.router, prefix='/api')
app.include_router(suggestions.router, prefix='/api')
app.include_router(chat.router, prefix='/api')

@app.get('/api/health')
def health():
    return {'status': 'ok'}
