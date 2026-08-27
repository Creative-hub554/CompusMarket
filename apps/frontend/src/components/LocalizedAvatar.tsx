"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

interface LocalizedAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function LocalizedAvatar({ src, alt, fallback, size = "md", className }: LocalizedAvatarProps) {
  const locale = useLocale();
  const t = useTranslations("avatar");

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`relative inline-block rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: "var(--surface-2)" }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || t("avatarAlt")}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-medium"
          style={{ color: "var(--text-body)" }}
        >
          {fallback || getInitials(alt || t("fallback"))}
        </div>
      )}
    </div>
  );
}