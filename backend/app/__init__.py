"""MAUSAM backend package initialization.

Keep the AI response budget high enough for models that use hidden reasoning tokens.
The assistant itself remains responsible for returning only concise user-facing text.
"""

import re

from .services import ai_assistant as _ai_assistant

# DeepSeek thinking/reasoning can consume part of the provider's token budget before
# the visible answer is produced. 280 was too small and caused visibly truncated replies.
_ai_assistant._MAX_OUTPUT_TOKENS = 768

# The rule fallback already knows how to answer normal run/jog/workout questions,
# but "sprinting" does not match its existing keyword check. Extend that fallback
# without changing the main provider chain or the user-facing AI API.
_original_fallback_reply = _ai_assistant._fallback_reply


def _enhanced_fallback_reply(message, weather, forecast, air_quality, locale):
    lower = message.lower()
    fitness_intent = re.search(
        r"\b(?:sprint|sprinting|jog|jogging|run|running)\b",
        lower,
    )

    if fitness_intent:
        current = weather.current
        location = weather.location.name
        hindi = locale.lower().startswith("hi")

        # High humidity materially reduces evaporative cooling, so sprinting is
        # not an appropriate "conditions look good" answer at this threshold.
        if current.humidity is not None and current.humidity >= 80:
            if hindi:
                return (
                    f"{location} में अभी sprinting के लिए मौसम आदर्श नहीं है: "
                    f"तापमान {current.temperature:.0f}°C और नमी {current.humidity:.0f}% है। "
                    "इतनी अधिक नमी में शरीर को ठंडा रखना कठिन होता है; हल्की दौड़, indoor workout "
                    "या कम नमी वाले समय का इंतजार बेहतर रहेगा।"
                )
            return (
                f"Sprinting is not ideal right now in {location}: "
                f"{current.temperature:.0f}°C with {current.humidity:.0f}% humidity. "
                "High humidity makes cooling harder, so consider an easier run, an indoor workout, "
                "or wait for a less humid period."
            )

        # Reuse the existing fitness decision logic for normal humidity,
        # including UV and near-term rain checks.
        return _original_fallback_reply(
            f"run {message}", weather, forecast, air_quality, locale
        )

    return _original_fallback_reply(message, weather, forecast, air_quality, locale)


_ai_assistant._fallback_reply = _enhanced_fallback_reply
