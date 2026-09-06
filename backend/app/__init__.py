"""MAUSAM backend package initialization.

Keep the AI response budget high enough for models that use hidden reasoning tokens.
The assistant itself remains responsible for returning only concise user-facing text.
"""

from .services import ai_assistant as _ai_assistant

# DeepSeek thinking/reasoning can consume part of the provider's token budget before
# the visible answer is produced. 280 was too small and caused visibly truncated replies.
_ai_assistant._MAX_OUTPUT_TOKENS = 768
