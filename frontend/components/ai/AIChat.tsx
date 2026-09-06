"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { sendChatMessage } from "@/lib/api/ai";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import { locationLabel } from "@/lib/utils/format";
import { cleanAiReply } from "@/lib/utils/cleanAiReply";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { ChatMessage } from "@/lib/types";

const SUGGESTION_KEYS: TranslationKey[] = [
  "assistant.suggest.run",
  "assistant.suggest.rain",
  "assistant.suggest.travel",
  "assistant.suggest.event",
];

export function AIChat() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { t, locale } = useLanguage();
  const welcome = t("assistant.welcome", { name: location.name });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: welcome,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
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
        locale
      );
      setMessages((prev) => [...prev, { role: "assistant", content: cleanAiReply(res.reply) }]);
    } catch {
      setError(t("assistant.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600">
          <Sparkles className="h-4 w-4 text-navy-950" />
        </div>
        <div>
          <p className="text-sm font-semibold text-mist-100">{t("assistant.title")}</p>
          <p className="text-xs text-mist-400">{t("assistant.context", { name: location.name })}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === "user" ? "bg-sky-500/20" : "bg-white/10"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4 text-sky-300" /> : <Bot className="h-4 w-4 text-mist-200" />}
            </div>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user" ? "bg-sky-500/15 text-mist-100" : "bg-white/[0.06] text-mist-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Bot className="h-4 w-4 text-mist-200" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-mist-400" />
              <span className="text-xs text-mist-400">{t("assistant.thinking")}</span>
            </div>
          </div>
        )}
        {error && <p className="text-center text-xs text-rose-400">{error}</p>}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-6 pb-3">
          {SUGGESTION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleSend(t(key))}
              className="min-h-11 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-mist-300 transition-colors hover:bg-white/10"
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend(input);
        }}
        className="flex items-center gap-2 border-t border-white/5 p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("assistant.placeholder")}
          className="min-h-11 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-mist-100 outline-none placeholder:text-mist-400 focus:border-sky-400/50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500 text-navy-950 transition-colors hover:bg-sky-400 disabled:opacity-40"
          aria-label={t("home.ai.send")}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
