const ANSWER_KEYS = ["answer", "response", "reply", "content", "message"] as const;

/**
 * Final UI safety net for provider output. The backend already strips reasoning,
 * but this keeps accidental JSON/code-fence scaffolding out of the chat bubble.
 */
export function cleanAiReply(value: string): string {
  if (!value) return value;

  let cleaned = value.replace(/\r\n/g, "\n").trim();
  cleaned = cleaned.replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    try {
      const parsed: unknown = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object") {
        for (const key of ANSWER_KEYS) {
          const candidate = (parsed as Record<string, unknown>)[key];
          if (typeof candidate === "string" && candidate.trim()) {
            cleaned = candidate.trim();
            break;
          }
        }
      }
    } catch {
      // Keep the original text if it is not valid JSON.
    }
  }

  const lines = cleaned
    .split("\n")
    .filter((line) => !/^\s*(?:thinking process|analysis|chain of thought|internal reasoning|scratchpad)\s*:?\s*$/i.test(line))
    .filter((line) => !/^\s*(?:reasoning_content|prompt|system prompt)\s*:/i.test(line));

  cleaned = lines.join("\n").trim();
  cleaned = cleaned.replace(/^\s*(?:direct answer|final answer|answer|response)\s*:\s*/i, "").trim();

  return cleaned || value.trim();
}
