"use client";

import { useState, useEffect, useRef } from "react";

type Lang = "en" | "km";
type Skill = "auto" | "product_search" | "feed" | "jobs" | "resume";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  skill?: string | null;
};

const ASSISTANT_URL = process.env.NEXT_PUBLIC_ASSISTANT_URL || "http://localhost:8001";

const SKILLS: { id: Skill; label: Record<Lang, string> }[] = [
  { id: "auto", label: { en: "Auto", km: "ស្វ័យប្រវត្តិ" } },
  { id: "product_search", label: { en: "Products", km: "ផលិតផល" } },
  { id: "feed", label: { en: "Feed", km: "មាតិកា" } },
  { id: "jobs", label: { en: "Jobs", km: "ការងារ" } },
  { id: "resume", label: { en: "Resume", km: "ប្រវត្តិរូប" } },
];

const SKILL_TAGS: Record<string, string> = {
  product_search: "Products",
  feed: "Feed",
  jobs: "Jobs",
  resume: "Resume",
};

const STRINGS: Record<
  Lang,
  { title: string; greeting: string; placeholder: string; send: string; error: string }
> = {
  en: {
    title: "Champey Assistant",
    greeting:
      "Hi! I'm your Champey assistant. I can help you find products, discover feed content, recommend jobs, and build your resume — in English or Khmer.",
    placeholder: "Ask about products, feed, jobs, or resumes…",
    send: "Send",
    error: "Something went wrong. Is the assistant running on port 8001?",
  },
  km: {
    title: "ជំនួយការ Champey",
    greeting:
      "សួស្តី! ខ្ញុំជាជំនួយការ Champey។ ខ្ញុំអាចជួយអ្នកស្វែងរកផលិតផល រកមើលមាតិកា ណែនាំការងារ និងបង្កើតប្រវត្តិរូប—ជាភាសាអង់គ្លេស ឬខ្មែរ។",
    placeholder: "សួរអំពីផលិតផល មាតិកា ការងារ ឬប្រវត្តិរូប…",
    send: "ផ្ញើ",
    error: "មានបញ្ហា។ តើជំនួយការកំពុងដំណើរការលើ port 8001 ទេ?",
  },
};

function getSessionId(): string {
  if (typeof window === "undefined") return "web";
  let id = window.localStorage.getItem("champeyAssistantSessionId");
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("champeyAssistantSessionId", id);
  }
  return id;
}

const MOCK_DATA: Record<Exclude<Skill, "auto">, Record<Lang, string>> = {
  product_search: {
    en: "Here are some products that match:\n\n• Khmer Silk Scarf — $18 (Like New)\n• Handwoven Rattan Basket — $25 (Good)\n• Ceramic Tea Set — $32 (New)\n\nYou can refine by category, price, or condition.",
    km: "នេះជាផលិតផលដែលត្រូវគ្នា៖\n\n• ក្រម៉ាសូត្រខ្មែរ — 18 ដុល្លារ (ដូចថ្មី)\n• កន្ត្រកឫស្សី — 25 ដុល្លារ (ល្អ)\n• ឈុតតែសេរ៉ាមិច — 32 ដុល្លារ (ថ្មី)\n\nអ្នកអាចចម្រាញ់តាមប្រភេទ តម្លៃ ឬស្ថានភាព។",
  },
  feed: {
    en: "For your feed, try these suggestions:\n\n• Filter: Trending · Newest · Following\n• Caption: \"Fresh finds at the market today 🌿\"\n• Search tip: short keywords like #handmade\n\nWant me to write a full caption?",
    km: "សម្រាប់មាតិការបស់អ្នក សាកល្បងទាំងនេះ៖\n\n• តម្រង៖ កំពុងពេញនិយម · ថ្មីបំផុត · តាមដាន\n• ចំណងជើង៖ \"របស់ថ្មីនៅផ្សារថ្ងៃនេះ 🌿\"\n• គន្លឹះស្វែងរក៖ ពាក្យគន្លឹះខ្លីដូចជា #ធ្វើដោយដៃ\n\nចង់ឱ្យខ្ញុំសរសេរចំណងជើងពេញទេ?",
  },
  jobs: {
    en: "Here are a few openings that match:\n\n• Junior Web Developer — Phnom Penh (Full-time)\n• Graphic Designer — Remote (Freelance)\n• Sales Associate — Siem Reap (Part-time)\n\nWant me to filter by location or type?",
    km: "នេះជាការងារដែលត្រូវគ្នាមួយចំនួន៖\n\n• អ្នកអភិវឌ្ឍវេប Junior — ភ្នំពេញ (ពេញម៉ោង)\n• អ្នករចនាក្រាហ្វិក — ពីចម្ងាយ (ឯករាជ្យ)\n• បុគ្គលិកលក់ — សៀមរាប (ក្រៅម៉ោង)\n\nចង់ឱ្យខ្ញុំតម្រងតាមទីតាំង ឬប្រភេទទេ?",
  },
  resume: {
    en: "I can help build your resume. A strong CV has:\n\n• A clear summary (2–3 lines)\n• Work experience with measurable results\n• Skills + languages\n\nTell me your target role and I'll draft bullet points.",
    km: "ខ្ញុំអាចជួយបង្កើតប្រវត្តិរូបរបស់អ្នក។ CV ល្អគួរមាន៖\n\n• សេចក្តីសង្ខេបច្បាស់លាស់ (2–3 បន្ទាត់)\n• បទពិសោធន៍ការងារជាមួយលទ្ធផលវាស់វែងបាន\n• ជំនាញ + ភាសា\n\nប្រាប់ខ្ញុំពីតួនាទីគោលដៅ ហើយខ្ញុំនឹងសរសេរចំណុចៗឱ្យ។",
  },
};

function detectSkill(message: string): Exclude<Skill, "auto"> {
  const q = message.toLowerCase();
  if (/job|career|work|hiring|position|ការងារ/.test(q)) return "jobs";
  if (/resume|cv|cover letter|ប្រវត្តិរូប/.test(q)) return "resume";
  if (/feed|post|caption|story|content|មាតិកា|ចំណងជើង/.test(q)) return "feed";
  return "product_search";
}

function mockReply(message: string, selected: Skill, lang: Lang): { reply: string; skill: string } {
  const skill = selected === "auto" ? detectSkill(message) : (selected as Exclude<Skill, "auto">);
  return { reply: MOCK_DATA[skill][lang], skill };
}

export function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [skill, setSkill] = useState<Skill>("auto");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("champeyAssistantLang") as Lang | null;
    if (stored === "en" || stored === "km") setLang(stored);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: STRINGS[lang].greeting }]);
    }
  }, [isOpen, lang, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const changeLang = (next: Lang) => {
    setLang(next);
    window.localStorage.setItem("champeyAssistantLang", next);
    if (isOpen) {
      setMessages((prev) => [{ role: "assistant", content: STRINGS[next].greeting }, ...prev]);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setIsLoading(true);

    let reply: string;
    let replySkill: string | null = null;

    try {
      const res = await fetch(`${ASSISTANT_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          language: lang,
          session_id: getSessionId(),
          skill,
        }),
      });
      const data = await res.json();
      if (data.reply && !data.error) {
        reply = data.reply;
        replySkill = data.skill || null;
      } else {
        const mock = mockReply(content, skill, lang);
        reply = mock.reply;
        replySkill = mock.skill;
      }
    } catch {
      const mock = mockReply(content, skill, lang);
      reply = mock.reply;
      replySkill = mock.skill;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: reply, skill: replySkill },
    ]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-[0_8px_30px_-6px_rgba(255,107,94,0.6)] flex items-center justify-center bg-gradient-to-br from-gold-500 to-gold-600 hover:scale-105 active:scale-95 transition-transform"
          aria-label={STRINGS[lang].title}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/champey-mark.svg" alt="" width={30} height={30} />
        </button>
      )}

      {isOpen && (
        <div className="w-80 sm:w-96 glass-card !rounded-2xl flex flex-col max-h-[560px] overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="gradient-mesh text-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/champey-mark.svg" alt="" width={20} height={20} />
              {STRINGS[lang].title}
            </div>
            <div className="flex gap-1 items-center">
              {(["en", "km"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => changeLang(l)}
                  aria-pressed={lang === l}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    lang === l ? "bg-white text-gold-700 font-bold" : "text-white/80 hover:bg-white/15"
                  }`}
                >
                  {l === "en" ? "EN" : "ខ្មែរ"}
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

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px] max-h-[340px] bg-[var(--bg-body)]"
          >
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
                  {msg.role === "assistant" && msg.skill && SKILL_TAGS[msg.skill] && (
                    <span className="block mt-1.5 text-[10px] uppercase tracking-wider text-gold-600 dark:text-gold-300 font-bold">
                      {SKILL_TAGS[msg.skill]}
                    </span>
                  )}
                </div>
              </div>
            ))}

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

          {/* Skill chips */}
          <div className="px-3 pt-2 flex gap-1.5 flex-wrap border-t border-[var(--border-subtle)] bg-[var(--surface)]">
            {SKILLS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSkill(s.id)}
                aria-pressed={skill === s.id}
                className={`text-xs rounded-full px-2.5 py-1 transition border ${
                  skill === s.id
                    ? "bg-gold-500 text-white border-gold-500 font-semibold"
                    : "bg-[var(--surface-2)] text-slate-600 dark:text-slate-300 border-[var(--border-subtle)] hover:border-gold-400/60"
                }`}
              >
                {s.label[lang]}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 bg-[var(--surface)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={STRINGS[lang].placeholder}
                className="input-field flex-1 rounded-full px-3.5 py-1.5"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                aria-label={STRINGS[lang].send}
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white text-sm px-4 py-1.5 rounded-full disabled:opacity-50 transition-all active:scale-95"
              >
                {STRINGS[lang].send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
