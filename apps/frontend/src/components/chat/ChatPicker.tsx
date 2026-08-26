"use client";

import { useEffect, useRef, useState } from "react";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😂", "🥹", "😊", "😍", "🤔", "😎", "🥳",
      "😴", "😢", "😭", "😤", "😱", "🤯", "🥶", "🤒",
      "🤡", "💩", "👻", "💀", "🤖", "👽", "🤠", "🥸",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👌", "✌️", "🤞", "🤝", "🙏", "💪",
      "👀", "🫶", "👋", "🖐️", "🤙", "👆", "👇", "🫡",
      "🤌", "🫰", "🤛", "🤜", "👏", "🙌", "🤲", "✊",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
      "💝", "😍‍", "😻", "🫶🏻", "💐", "🌹", "🌺", "🌸",
    ],
  },
  {
    label: "Fun",
    emojis: [
      "🎉", "🎁", "⚡", "🔥", "🚀", "⭐", "🌟", "🏆",
      "🎸", "🎮", "☕", "🍕", "🌮", "🍜", "🍰", "🍀",
      "🌈", "☀️", "🌙", "⚽", "🏀", "🎯", "🎲", "🧩",
    ],
  },
];

const STICKERS = [
  "🦄", "🐼", "🐸", "🐱", "🐶", "🦊", "🐷", "🐔",
  "🦖", "🐙", "🐵", "🦉", "🐝", "🦋", "🐢", "🦜",
  "🌸", "🌺", "🌻", "🍀", "🌈", "🎉", "🎁", "🚀",
  "👑", "💎", "🏆", "🎸", "🤘", "🙌", "💖", "💯",
];

type Props = {
  mode: "emoji" | "sticker";
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function ChatPicker({ mode, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={mode === "emoji" ? "Emoji picker" : "Sticker picker"}
      className="absolute bottom-full mb-2 right-0 w-72 glass-card !rounded-2xl p-3 z-20 animate-slide-up shadow-[0_16px_32px_-12px_rgba(15,23,42,0.35)]"
    >
      {mode === "emoji" ? (
        <>
          <div className="flex gap-1 mb-2">
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={g.label}
                onClick={() => setTab(i)}
                aria-pressed={tab === i}
                className={`flex-1 text-[10px] font-semibold rounded-full py-1 transition-colors ${
                  tab === i
                    ? "bg-gold-500/15 text-gold-600 dark:text-gold-300"
                    : "text-slate-400 hover:bg-slate-500/10"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
            {EMOJI_GROUPS[tab].emojis.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => onSelect(emoji)}
                aria-label={`Insert ${emoji}`}
                className="h-8 w-8 flex items-center justify-center text-xl rounded-lg hover:bg-[var(--surface-2)] hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-6 gap-1 max-h-52 overflow-y-auto">
          {STICKERS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              aria-label={`Send sticker ${emoji}`}
              className="h-11 w-11 flex items-center justify-center text-3xl rounded-xl hover:bg-[var(--surface-2)] hover:scale-110 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
