"use client";

import { AIChat } from "@/components/ai/AIChat";
import { useLanguage } from "@/context/LanguageContext";

export default function AssistantPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-white dark:text-neutral-100">{t("assistant.title")}</h1>
      <p className="mt-1 mb-6 text-sm font-medium text-white/80 dark:text-neutral-400">
        {t("assistant.subtitle")}
      </p>
      <AIChat />
    </div>
  );
}
