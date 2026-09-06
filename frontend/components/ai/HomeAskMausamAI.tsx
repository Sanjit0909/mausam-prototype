"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api/ai";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import { resolvePersonaId, type PersonaId } from "@/lib/personalization/personaConfig";
import { locationLabel } from "@/lib/utils/format";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { ChatMessage, ChatSource } from "@/lib/types";

const SOURCE_LABELS: Record<Exclude<ChatSource, "fallback">, string> = {
  deepseek: "DeepSeek V4 Flash",
  gemini: "Gemini",
  openrouter: "OpenRouter",
};

const SUGGESTIONS: Record<PersonaId | "default", TranslationKey[]> = {
  farmer: ["home.ai.suggest.farmer1", "home.ai.suggest.farmer2", "home.ai.suggest.farmer3"],
  runner: ["home.ai.suggest.runner1", "home.ai.suggest.runner2", "home.ai.suggest.runner3"],
  traveller: ["home.ai.suggest.traveller1", "home.ai.suggest.traveller2", "home.ai.suggest.traveller3"],
  marine: ["home.ai.suggest.marine1", "home.ai.suggest.marine2", "home.ai.suggest.marine3"],
  family: ["assistant.suggest.rain", "assistant.suggest.travel", "assistant.suggest.event"],
  health_vulnerable: ["assistant.suggest.rain", "assistant.suggest.run", "assistant.suggest.event"],
  disaster: ["assistant.suggest.rain", "assistant.suggest.travel", "assistant.suggest.event"],
  default: ["assistant.suggest.run", "assistant.suggest.rain", "assistant.suggest.travel"],
};

interface DisplayMessage extends ChatMessage {
  source?: ChatSource;
}

export function HomeAskMausamAI() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const personaId = resolvePersonaId(
    preferences.interests,
    preferences.persona_profile?.primary_persona
  );
  const welcome = t("home.ai.welcome", { name: location.name });
  const [messages, setMessages] = useState<DisplayMessage[]>([{ role: "assistant", content: welcome }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestionKeys = SUGGESTIONS[personaId] ?? SUGGESTIONS.default;

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant" && !prev[0].source) {
        return [{ ...prev[0], content: welcome }];
      }
      return prev;
    });
  }, [welcome]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await sendChatMessage(
        trimmed,
        location.lat,
        location.lon,
        locationLabel(location),
        preferences.interests,
        history,
        locale,
        personaId,
        preferences.persona_profile ? JSON.stringify(preferences.persona_profile) : undefined
      );
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply, source: res.source }]);
    } catch {
      setError(t("assistant.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass glass-hover flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left md:w-auto"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-semibold text-mist-100">{t("home.ai.cta")}</span>
        </span>
        <Bot className="h-4 w-4 text-mist-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch md:p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={t("home.ai.close")}
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={t("home.ai.cta")}
            className="relative z-10 flex h-[85vh] w-full flex-col rounded-t-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl md:my-auto md:h-[min(720px,90vh)] md:w-[440px] md:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-mist-100">{t("home.ai.cta")}</p>
                <p className="text-[11px] text-mist-400">{t("assistant.context", { name: location.name })}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-mist-400 hover:bg-white/5 hover:text-mist-100"
                aria-label={t("home.ai.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-sky-500/20 text-mist-100" : "bg-white/5 text-mist-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.source && (
                      <p className="mt-1 text-[10px] text-mist-500">
                        {m.source === "fallback" ? t("assistant.source.fallback") : SOURCE_LABELS[m.source]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-mist-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("assistant.thinking")}
                </div>
              )}
              {error && <p className="text-xs text-rose-400">{error}</p>}
            </div>

            <div className="space-y-2 border-t border-white/10 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {suggestionKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSend(t(key))}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-mist-300 hover:bg-white/10"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("assistant.placeholder")}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-sky-500/40"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-sky-500/20 p-2 text-sky-300 disabled:opacity-40"
                  aria-label={t("home.ai.send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
