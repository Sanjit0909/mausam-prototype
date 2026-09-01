from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    lat: float
    lon: float
    location_name: str | None = None
    interests: list[str] = []
    units: str = "metric"
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    source: str  # "gemini" | "fallback"
