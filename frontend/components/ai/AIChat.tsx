"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { sendChatMessage } from "@/lib/api/ai";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { locationLabel } from "@/lib/utils/format";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Should I go for a run today?",
  "Will it rain tonight?",
  "What should I carry if I travel tomorrow?",
  "Is today good for an outdoor event?",
];

interface DisplayMessage extends ChatMessage {
  source?: "gemini" | "fallback";
}

export function AIChat() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm your MAUSAM weather assistant. Ask me anything about the weather in ${location.name} \u2014 running conditions, rain chances, travel packing, or event planning.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await sendChatMessage(trimmed, location.lat, location.lon, locationLabel(location), preferences.interests, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply, source: res.source }]);
    } catch {
      setError("The assistant is having trouble responding right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass flex h-[70vh] min-h-[480px] flex-col rounded-3xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600">
          <Sparkles className="h-4 w-4 text-navy-950" />
        </div>
        <div>
          <p className="text-sm font-semibold text-mist-100">MAUSAM Assistant</p>
          <p className="text-xs text-mist-400">Context-aware for {location.name}</p>
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
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user" ? "bg-sky-500/15 text-mist-100" : "bg-white/[0.06] text-mist-200"
            }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.source === "fallback" && (
                <p className="mt-1.5 text-[10px] uppercase tracking-wide text-mist-400">Smart Assistant &middot; offline mode</p>
              )}
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
              <span className="text-xs text-mist-400">Thinking...</span>
            </div>
          </div>
        )}
        {error && <p className="text-center text-xs text-rose-400">{error}</p>}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-6 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-mist-300 hover:bg-white/10 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 border-t border-white/5 p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the weather..."
          className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-navy-950 transition-colors hover:bg-sky-400 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
