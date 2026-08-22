"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/useTranslation";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

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
  en: "Hi! I'm your shopping guide. Ask me anything about the site — find products, discover shops on /market, or explore our free tools!",
  zh: "您好！我是您的购物向导。您可以问我任何关于本站的问题——找商品、逛 /market 市场，或探索我们的免费工具！",
  km: "សួស្តី! ខ្ញុំជាមគ្គុទ្ទេសក៍ទិញទំនិញរបស់អ្នក។ សូមសួរខ្ញុំអ្វីៗទាំងអស់អំពីគេហទំព័រ—រកទំនិញ មើលផ្សារនៅ /market ឬស្វែងរកឧបករណ៍ឥតគិតថ្លៃរបស់យើង!",
};

const STARTERS: Record<Lang, string[]> = {
  en: ["What can this site do?", "Gift ideas under $50", "Browse the market", "How do I sell here?"],
  zh: ["这个网站能做什么？", "50美元以内的礼物推荐", "逛逛市场", "如何在这里卖东西？"],
  km: ["គេហទំព័រនេះធ្វើអ្វីបាន?", "យោបល់អំណោយក្រោម 50 ដុល្លារ", "មើលផ្សារ", "ធ្វើដូចម្ដេចដើម្បីលក់?"],
};

const PATH_LABELS: Record<string, string> = {
  "/market": "Market",
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
    const userMessage: AssistantMessage = {
      role: "user",
      content,
      lang,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await authedFetch("/api/ai/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, lang, hasResume, page: pathname }),
      });
      const data = await res.json();
      const aiResponse = data.reply || "Sorry, I couldn't process that.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse,
          lang,
          products: Array.isArray(data.products) ? data.products : undefined,
          links: Array.isArray(data.links) ? data.links : undefined,
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
          aria-label={t.aiAssistant.title}
        >
          💬
        </button>
      )}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[500px]">
          <div className="bg-indigo-600 text-white p-3 rounded-t-lg flex justify-between items-center">
            <div className="font-semibold text-sm">{t.aiAssistant.title}</div>
            <div className="flex gap-1">
              {(["en", "zh", "km"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => changeLang(l)}
                  className={`px-2 py-0.5 text-xs rounded ${lang === l ? "bg-white text-indigo-600 font-bold" : "text-white/80 hover:bg-indigo-700"}`}
                >
                  {l === "en" ? "EN" : l === "zh" ? "中文" : "ខ្មែរ"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white ml-2"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[320px]">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`text-sm whitespace-pre-wrap ${msg.role === "assistant" ? "text-gray-800" : "text-indigo-700 font-medium text-right"}`}>
                  {msg.content}
                </div>
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/shop/${product.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 p-2 rounded border border-gray-100 hover:bg-indigo-50 transition"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs">No img</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-gray-400">
                            ${product.price} · {CONDITION_LABELS[product.condition] ?? product.condition}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {msg.role === "assistant" && msg.links && msg.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.links.map((link) => (
                      <Link
                        key={link}
                        href={link}
                        onClick={() => setIsOpen(false)}
                        className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 rounded-full px-2.5 py-1 transition"
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
                    className="text-xs bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 border border-gray-200 rounded-full px-2.5 py-1 transition"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
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
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded disabled:opacity-50"
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
