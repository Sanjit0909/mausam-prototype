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
    locale: str = "en"  # "en" | "hi"
    primary_persona: str | None = None
    persona_profile_json: str | None = None


class ChatResponse(BaseModel):
    reply: str
    source: str  # "deepseek" | "gemini" | "openrouter" | "fallback"
    fallback_used: bool = False
    model: str | None = None
