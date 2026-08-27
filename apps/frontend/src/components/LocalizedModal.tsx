"use client";

import { useLocale, useTranslations } from "next-intl";
import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface LocalizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function LocalizedModal({ isOpen, onClose, title, children, className }: LocalizedModalProps) {
  const locale = useLocale();
  const t = useTranslations("modal");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className={`relative w-full max-w-md rounded-lg shadow-xl ${className}`}
        style={{ 
          backgroundColor: "var(--surface)",
          borderColor: "var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-body)" }}>{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}