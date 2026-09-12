"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/useTranslation";
import { useAuthedFetch } from "@/lib/useAuthedFetch";
import { useHandleApiError } from "@/lib/useHandleApiError";

type Lang = "en" | "zh" | "km";

type AssistantProduct = {
  id: string;
  name: string;
  price: number;
  condition: string;
  categoryName?: string;
  image?: string | null;
};

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  lang: Lang;
  products?: AssistantProduct[];
  links?: string[];
};

const GREETINGS: Record<Lang, string> = {
  en: "Hi! I'm your shopping guide. Ask me anything about the site — find products, discover shops on /shop, or explore our free tools!",
  zh: "您好！我是您的购物向导。您可以问我任何关于本站的问题——找商品、逛 /shop 商城，或探索我们的免费工具！",
  km: "សួស្តី! ខ្ញុំជាមគ្គុទ្ទេសក៍ទិញទំនិញរបស់អ្នក។ សូមសួរខ្ញុំអ្វីៗទាំងអស់អំពីគេហទំព័រ—រកទំនិញ មើលផ្សារនៅ /shop ឬស្វែងរកឧបករណ៍ឥតគិតថ្លៃរបស់យើង!",
};

const STARTERS: Record<Lang, string[]> = {
  en: ["What can this site do?", "Gift ideas under $50", "Browse the shop", "How do I sell here?"],
  zh: ["这个网站能做什么？", "50美元以内的礼物推荐", "逛逛商城", "如何在这里卖东西？"],
  km: ["គេហទំព័រនេះធ្វើអ្វីបាន?", "យោបល់អំណោយក្រោម 50 ដុល្លារ", "មើលផ្សារ", "ធ្វើដូចម្ដេចដើម្បីលក់?"],
};

const PATH_LABELS: Record<string, string> = {
  "/shop": "Shop",
  "/cart": "Cart",
  "/orders": "Orders",
  "/warranties": "Warranties",
  "/community": "Community",
  "/community/careers": "Careers",
  "/community/resume": "Resume Builder",
  "/community/flashcards": "Flashcards",
  "/community/quizzes": "Quizzes",
  "/community/diagrams": "Diagrams",
  "/community/documents": "Documents",
  "/community/notes": "Notes",
  "/community/design": "Design",
  "/community/image-processor": "Image Tools",
  "/seller/apply": "Become a Seller",
  "/seller/dashboard": "Seller Dashboard",
  "/support": "Support",
  "/messages": "Messages",
  "/terms/buyer": "Buyer Terms",
  "/terms/seller": "Seller Terms",
};

const CONDITION_LABELS: Record<string, string> = {
  A: "Like New",
  B: "Good",
  C: "Fair",
};

export function AiAssistant() {
  const { t } = useTranslation();
  const authedFetch = useAuthedFetch();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [hasResume, setHasResume] = useState<boolean>(false);
  const _handleApiError = useHandleApiError();

  useEffect(() => {
    const storedLang = localStorage.getItem("aiAssistantLang") as Lang | null;
    if (storedLang && ["en", "zh", "km"].includes(storedLang)) {
      setLang(storedLang);
    }
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: GREETINGS[lang],
          lang,
        },
      ]);
    }
  }, [isOpen, lang, messages.length]);

  useEffect(() => {
    (async () => {
      try {
        const data = await authedFetch<unknown[]>("/api/resumes", { method: "GET" });
        setHasResume(Array.isArray(data) && data.length > 0);
      } catch (err) {
        await _handleApiError(err, "check your resume", true);
      }
    })();
  }, [authedFetch]);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("aiAssistantLang", newLang);
    if (isOpen) {
      setMessages((prev) => [
        ...prev.filter((m) => m.role === "assistant" && m.products && m.products.length > 0),
        { role: "assistant", content: GREETINGS[newLang], lang: newLang },
      ]);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    // Capture request params at call time so the retryFn (invoked 800ms after
    // a 5xx failure) replays the same request instead of re-reading component
    // state that may have changed in the interim.
    const requestLang = lang;
    const requestHasResume = hasResume;
    const requestPage = pathname;

    const userMessage: AssistantMessage = {
      role: "user",
      content,
      lang: requestLang,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const body = { message: content, lang: requestLang, hasResume: requestHasResume, page: requestPage };

    try {
      const data = await authedFetch<{
        reply?: string;
        products?: AssistantProduct[];
        links?: string[];
      }>("/api/ai/assistant/chat", {
        method: "POST",
        body,
      });
      const aiResponse = data.reply || "Sorry, I couldn't process that.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse,
          lang: requestLang,
          products: Array.isArray(data.products) ? data.products : undefined,
          links: Array.isArray(data.links) ? data.links : undefined,
        },
      ]);
    } catch (err) {
      // useHandleApiError toasts (and redirects on 401). Here we surface a
      // specific message in the chat so the conversation isn't left hanging.
      const { retryResult } = await _handleApiError(err, "get a response from the assistant", false, true, () =>
        authedFetch<{
          reply?: string;
          products?: AssistantProduct[];
          links?: string[];
        }>("/api/ai/assistant/chat", {
          method: "POST",
          body,
        }),
      );
      if (retryResult) {
        const data = retryResult as { reply?: string; products?: AssistantProduct[]; links?: string[] };
        const aiResponse = data.reply || "Sorry, I couldn't process that.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: aiResponse,
            lang: requestLang,
            products: Array.isArray(data.products) ? data.products : undefined,
            links: Array.isArray(data.links) ? data.links : undefined,
          },
        ]);
      } else {
        const isApiError = err instanceof Error && "status" in err;
        const status = isApiError ? (err as { status: number }).status : null;
        const chatMessage =
          status === 401
            ? "Sign in again to continue chatting with the assistant."
            : status === 404
              ? "The assistant isn't available right now."
              : status === 403
                ? "You don't have permission to use the assistant."
                : status === 409
                  ? "That request was already processed."
                  : status !== null && status >= 500
                    ? "The assistant is having trouble. Please try again."
                    : "Couldn't reach the assistant. Check your connection and try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: chatMessage, lang: requestLang },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-[0_8px_30px_-6px_rgba(176,141,62,0.6)] flex items-center justify-center bg-gradient-to-br from-gold-500 to-gold-600 hover:scale-105 active:scale-95 transition-transform"
          aria-label={t.aiAssistant.title}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/champey-mark.svg" alt="" width={30} height={30} />
        </button>
      )}
      {isOpen && (
        <div className="w-80 sm:w-96 glass-card !rounded-2xl flex flex-col max-h-[520px] overflow-hidden animate-slide-up">
          <div className="gradient-mesh text-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/champey-mark.svg" alt="" width={20} height={20} />
              {t.aiAssistant.title}
            </div>
            <div className="flex gap-1">
              {(["en", "zh", "km"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => changeLang(l)}
                  aria-pressed={lang === l}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${lang === l ? "bg-white text-gold-700 font-bold" : "text-white/80 hover:bg-white/15"}`}
                >
                  {l === "en" ? "EN" : l === "zh" ? "中文" : "ខ្មែរ"}
                </button>
              ))}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white ml-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[200px] max-h-[320px] bg-[var(--bg-body)]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] text-sm whitespace-pre-wrap px-3 py-2 ${
                    msg.role === "assistant"
                      ? "rounded-2xl rounded-bl-md bg-[var(--surface-2)] text-slate-800 dark:text-slate-200"
                      : "rounded-2xl rounded-br-md bg-gradient-to-r from-gold-500 to-gold-600 text-white font-medium"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 space-y-2 w-full">
                    {msg.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/shop/${product.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-gold-400/60 transition"
                      >
                        <div className="w-10 h-10 bg-[var(--surface-2)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image ? (
                            <Image src={product.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">{product.name}</p>
                          <p className="text-xs text-slate-400">
                            ${product.price} · {CONDITION_LABELS[product.condition] ?? product.condition}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {msg.role === "assistant" && msg.links && msg.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 w-full">
                    {msg.links.map((link) => (
                      <Link
                        key={link}
                        href={link}
                        onClick={() => setIsOpen(false)}
                        className="text-xs bg-gold-50 dark:bg-gold-950/40 text-gold-700 dark:text-gold-300 hover:bg-gold-100 dark:hover:bg-gold-900/60 border border-gold-100 dark:border-gold-900 rounded-full px-2.5 py-1 transition"
                      >
                        {PATH_LABELS[link] ?? link} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length <= 1 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STARTERS[lang].map((starter) => (
                  <button
                    key={starter}
                    onClick={() => sendMessage(starter)}
                    className="text-xs bg-[var(--surface-2)] hover:bg-gold-50 dark:hover:bg-gold-950/40 text-slate-600 dark:text-slate-300 hover:text-gold-700 dark:hover:text-gold-300 border border-[var(--border-subtle)] rounded-full px-2.5 py-1 transition"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs px-1" aria-live="polite">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.aiAssistant.inputPlaceholder}
                className="input-field flex-1 rounded-full px-3.5 py-1.5"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white text-sm px-4 py-1.5 rounded-full disabled:opacity-50 transition-all active:scale-95"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
