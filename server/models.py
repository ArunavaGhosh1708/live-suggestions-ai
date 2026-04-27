from pydantic import BaseModel, Field
from typing import Optional

class SuggestionsRequest(BaseModel):
    recent_transcript: str
    session_summary: Optional[str] = ''
    full_transcript: Optional[str] = ''
    prompt: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    transcript: Optional[str] = ''
    history: list[ChatMessage] = Field(default_factory=list)
    system_prompt: Optional[str] = None

class SummaryRequest(BaseModel):
    transcript: str
