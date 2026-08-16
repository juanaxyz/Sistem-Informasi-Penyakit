from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None
    history: list[ChatHistoryItem] | None = None