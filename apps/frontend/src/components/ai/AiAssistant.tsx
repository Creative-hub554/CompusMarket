"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

type Lang = "en" | "zh" | "km";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  lang: Lang;
};

export function AiAssistant() {
  const { t } = useTranslation();
  const authedFetch = useAuthedFetch();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [hasResume, setHasResume] = useState<boolean>(false);

  useEffect(() => {
    const storedLang = localStorage.getItem("aiAssistantLang") as Lang | null;
    if (storedLang && ["en", "zh", "km"].includes(storedLang)) {
      setLang(storedLang);
    }
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: t.aiAssistant.greeting,
        lang,
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/resumes", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setHasResume(Array.isArray(data) && data.length > 0);
        }
      } catch {}
    })();
  }, [authedFetch]);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("aiAssistantLang", newLang);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: AssistantMessage = {
      role: "user",
      content: input,
      lang,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await authedFetch("/api/ai/assistant/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, lang, hasResume }),
      });
      const data = await res.json();
      const aiResponse = data.reply || "Sorry, I couldn't process that.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse,
          lang,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t.aiAssistant.error,
          lang,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl"
        >
          💬
        </button>
      )}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[500px]">
          <div className="bg-indigo-600 text-white p-3 rounded-t-lg flex justify-between items-center">
            <div className="font-semibold text-sm">AI Assistant</div>
            <div className="flex gap-1">
              {(["en", "zh", "km"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => changeLang(l)}
                  className={`px-2 py-0.5 text-xs rounded ${lang === l ? "bg-white text-indigo-600 font-bold" : "text-white/80 hover:bg-indigo-700"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[320px]">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-gray-400 text-xs mt-8">
                {t.aiAssistant.welcome}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`text-sm ${msg.role === "assistant" ? "text-gray-800" : "text-indigo-700 font-medium"}`}>
                {msg.role === "assistant" && <div className="font-bold text-xs text-gray-500 mb-1">AI:</div>}
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="text-gray-400 text-xs">AI is thinking...</div>
            )}
          </div>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.aiAssistant.inputPlaceholder}
                className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded disabled:opacity-50"
              >
                Send
              </button>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
