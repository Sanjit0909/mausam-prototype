import { AIChat } from "@/components/ai/AIChat";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-xl font-semibold text-mist-100">AI Weather Assistant</h1>
      <p className="mt-1 mb-6 text-sm text-mist-400">
        Ask questions in plain language - answers are grounded in your real, current weather data.
      </p>
      <AIChat />
    </div>
  );
}
