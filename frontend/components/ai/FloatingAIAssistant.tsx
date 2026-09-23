"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { streamChatMessage } from "@/lib/api/ai";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import { locationLabel } from "@/lib/utils/format";
import type { ChatMessage, ChatSource } from "@/lib/types";

interface DisplayMessage extends ChatMessage {
  id: string;
  source?: ChatSource;
}

const QUICK_SUGGESTIONS = [
  "Should I run outside today?",
  "Any rain expected in next 3 hours?",
  "Is AQI safe for kids?",
];

const SOURCE_LABELS: Record<string, string> = {
  deepseek: "DeepSeek V4 Flash",
  gemini: "Gemini 1.5 Flash",
  openrouter: "OpenRouter",
  fallback: "Verified Rule Engine",
};

/**
 * Lightweight, safe markdown formatter for assistant responses.
 * Formats bold, italics, bullet points, headers, inline code, and numbered lists.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-mist-100">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Headers: ### or ##
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-semibold text-sky-300 text-xs mt-2 uppercase tracking-wide">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-semibold text-sky-200 text-sm mt-2">
              {trimmed.slice(3)}
            </h3>
          );
        }

        // Bullet point: - or *
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-sky-400 font-bold">•</span>
              <span className="flex-1">{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered item: 1. 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-sky-400 font-medium text-xs pt-0.5">{numMatch[1]}.</span>
              <span className="flex-1">{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={idx}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Regex parsing for **bold** and `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-white/10 px-1 py-0.5 text-xs font-mono text-sky-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function FloatingAIAssistant() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { locale, t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeInterest = preferences.interests[0] ?? "outdoor_fitness";
  const dynamicSuggestions = useMemo(() => {
    if (activeInterest === "agriculture") {
      return locale === "hi"
        ? ["क्या आज कीटनाशक छिड़कना ठीक है?", "अगले 3 दिनों में बारिश होगी?", "गेहूं में सिंचाई की जरूरत है?"]
        : ["Is it safe to spray pesticides today?", "Will it rain in next 3 days?", "Does my wheat crop need irrigation?"];
    }
    if (activeInterest === "commuting") {
      return locale === "hi"
        ? ["क्या आज फ्लाईओवरों पर जलभराव का खतरा है?", "8:30 बजे दृश्यता कैसी रहेगी?", "क्या आज मेट्रो लेना चाहिए?"]
        : ["Is there waterlogging risk on flyovers today?", "What is road visibility during 8:30 AM rush?", "Should I take the metro?"];
    }
    if (activeInterest === "health") {
      return locale === "hi"
        ? ["क्या आज अस्थमा के मरीजों के लिए बाहर जाना ठीक है?", "वायु गुणवत्ता का मुख्य प्रदूषक क्या है?", "क्या N95 मास्क पहनना चाहिए?"]
        : ["Is air quality safe for asthmatics today?", "What is the peak PM2.5 hour?", "Do I need an N95 mask?"];
    }
    if (activeInterest === "marine_beach") {
      return locale === "hi"
        ? ["आज अगला उच्च ज्वार कब है?", "क्या समुद्र में तैरना सुरक्षित है?", "क्या मछुआरों के लिए चेतावनी जारी है?"]
        : ["When is the next high tide?", "Is it safe for beach swimming?", "Are fisherman warnings active?"];
    }
    if (activeInterest === "events") {
      return locale === "hi"
        ? ["क्या आज शाम बारिश से कार्यक्रम प्रभावित होगा?", "क्या टेंट के लिए हवा की गति सुरक्षित है?", "शाम का तापमान कैसा रहेगा?"]
        : ["Will rain affect outdoor events today?", "Are wind gusts safe for canopies?", "What is evening comfort index?"];
    }
    return locale === "hi"
      ? ["आज दौड़ने का सर्वोत्तम समय क्या है?", "क्या गर्मी और उमस बहुत अधिक है?", "क्या अगले 3 घंटे में बारिश होगी?"]
      : ["What is the best time to run today?", "Is heat and humidity elevated?", "Any rain expected in next 3 hours?"];
  }, [activeInterest, locale]);

  // Initialize welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText =
        locale === "hi"
          ? `नमस्ते! मैं आपका MAUSAM AI सहायक हूँ। ${location.name} के मौसम, बारिश या दिनचर्या के बारे में कुछ भी पूछें।`
          : `Hello! I'm your MAUSAM Weather Copilot. Ask me anything about ${location.name}'s conditions, rain timings, or outdoor plans!`;
      setMessages([
        {
          id: "welcome-msg",
          role: "assistant",
          content: welcomeText,
        },
      ]);
    }
  }, [location.name, locale, messages.length]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Auto-scroll on new messages or streamed tokens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading, isOpen]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    const welcomeText =
      locale === "hi"
        ? `चैट साफ़ कर दी गई है। मैं ${location.name} के मौसम पर आपकी क्या मदद कर सकता हूँ?`
        : `Chat refreshed. How can I help you with ${location.name}'s weather today?`;
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: welcomeText,
      },
    ]);
  };

  const handleSend = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const historyForApi: ChatMessage[] = messages
      .filter((m) => m.content.trim().length > 0)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: trimmed },
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);
    setInput("");
    setLoading(true);

    let streamedAccumulator = "";

    try {
      await streamChatMessage(
        trimmed,
        location.lat,
        location.lon,
        locationLabel(location),
        preferences.interests,
        historyForApi,
        locale,
        (token) => {
          streamedAccumulator += token;
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((m) => m.id === assistantMsgId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                content: streamedAccumulator,
              };
            }
            return updated;
          });
        },
        (meta) => {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findIndex((m) => m.id === assistantMsgId);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                source: (meta.source as ChatSource) ?? undefined,
              };
            }
            return updated;
          });
        },
        abortControllerRef.current.signal,
        preferences.persona_profile?.primary_persona ?? undefined,
        preferences.persona_profile ? JSON.stringify(preferences.persona_profile) : undefined
      );
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === assistantMsgId);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            content:
              locale === "hi"
                ? "मौसम सेवा से संपर्क करने में असमर्थ। कृपया पुनः प्रयास करें।"
                : "Unable to retrieve real-time weather advice right now. Please try again.",
            source: "fallback",
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button strictly at bottom-4 left-4 */}
      <div
        className="fixed z-50 bottom-4 left-4"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "1.5rem",
          zIndex: 50,
        }}
      >
        <div className="relative group">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Ask Mausam AI"
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 text-navy-950 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
              !isOpen ? "animate-idle-glow" : "shadow-sky-500/30"
            }`}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-navy-950 transition-transform duration-200 rotate-90 group-hover:rotate-0" />
            ) : (
              <div className="relative flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-navy-950 animate-pulse" />
                {/* Live pulsing indicator badge */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
              </div>
            )}
          </button>

          {/* Subtle tooltip */}
          {!isOpen && (
            <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-navy-900/90 border border-white/10 px-3 py-1.5 text-xs font-medium text-mist-200 shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Ask Mausam AI
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-navy-900/90" />
            </div>
          )}
        </div>
      </div>

      {/* Compact Popover Window: 380px wide, max 560px height */}
      {isOpen && (
        <div
          className="fixed z-50 bottom-20 left-4 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-6.5rem)] flex flex-col rounded-2xl border border-white/10 bg-navy-950/95 backdrop-blur-2xl shadow-2xl shadow-navy-950/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{
            position: "fixed",
            bottom: "5rem",
            left: "1.5rem",
            zIndex: 50,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-navy-950 shrink-0 shadow-md shadow-sky-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-mist-100 truncate">
                    Live Forecast Connected
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-mist-400 truncate">
                  <MapPin className="h-3 w-3 text-sky-400 shrink-0" />
                  <span className="truncate">{location.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleClear}
                title="Clear chat"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-mist-400 hover:bg-white/10 hover:text-mist-200 transition-colors active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-mist-400 hover:bg-white/10 hover:text-mist-200 transition-colors active:scale-95"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-white/5 bg-navy-900/40 no-scrollbar">
            {dynamicSuggestions.map((chip: string, i: number) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                disabled={loading}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist-300 transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-300 disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Body */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 scroll-smooth">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 animate-fade-in-up ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isUser
                        ? "bg-sky-500 text-navy-950 shadow-sm"
                        : "bg-white/10 text-mist-200"
                    }`}
                  >
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>

                  <div className={`group relative max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm transition-all ${
                        isUser
                          ? "bg-sky-500/20 border border-sky-400/30 text-mist-100 rounded-tr-sm"
                          : "bg-white/[0.06] border border-white/10 text-mist-200 rounded-tl-sm shadow-md"
                      }`}
                    >
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-dot-pulse-1" />
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-dot-pulse-2" />
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-dot-pulse-3" />
                          </div>
                          <span className="text-xs text-mist-400 font-medium">Analyzing weather...</span>
                        </div>
                      )}
                    </div>

                    {!isUser && msg.content && (
                      <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-mist-400">
                        <span>
                          {msg.source
                            ? SOURCE_LABELS[msg.source] || msg.source
                            : "Mausam Live AI"}
                        </span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-mist-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about weather or plans..."
              disabled={loading}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs text-mist-100 placeholder:text-mist-400 outline-none transition-colors focus:border-sky-400/60 focus:bg-white/[0.08]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-navy-950 transition-all hover:bg-sky-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
