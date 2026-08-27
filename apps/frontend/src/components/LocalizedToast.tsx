"use client";

import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface LocalizedToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export function LocalizedToast({ message, type = "info", duration = 3000, onClose, className }: LocalizedToastProps) {
  const locale = useLocale();
  const t = useTranslations("toast");

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timeoutId);
    }
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "var(--green-50)",
          borderColor: "var(--green-200)",
          color: "var(--green-800)",
          iconColor: "var(--green-500)",
        };
      case "error":
        return {
          backgroundColor: "var(--red-50)",
          borderColor: "var(--red-200)",
          color: "var(--red-800)",
          iconColor: "var(--red-500)",
        };
      case "warning":
        return {
          backgroundColor: "var(--yellow-50)",
          borderColor: "var(--yellow-200)",
          color: "var(--yellow-800)",
          iconColor: "var(--yellow-500)",
        };
      default:
        return {
          backgroundColor: "var(--blue-50)",
          borderColor: "var(--blue-200)",
          color: "var(--blue-800)",
          iconColor: "var(--blue-500)",
        };
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      default:
        return "ℹ";
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"} ${className}`}
      style={getTypeStyles()}
    >
      <span className="text-lg font-bold" style={{ color: getTypeStyles().iconColor }}>
        {getTypeIcon()}
      </span>
      <span className="font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-auto p-1 rounded-full hover:bg-opacity-20 transition-colors"
        style={{ color: getTypeStyles().iconColor }}
      >
        <X size={16} />
      </button>
    </div>
  );
}