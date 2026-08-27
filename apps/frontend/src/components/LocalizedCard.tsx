"use client";

import { ReactNode } from "react";

interface LocalizedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LocalizedCard({ children, className, onClick }: LocalizedCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all hover:shadow-md ${className} ${
        onClick ? "cursor-pointer hover:scale-[1.02]" : ""
      }`}
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface LocalizedCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function LocalizedCardHeader({ children, className }: LocalizedCardHeaderProps) {
  return (
    <div className={`mb-3 ${className}`} style={{ color: "var(--text-body)" }}>
      {children}
    </div>
  );
}

interface LocalizedCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function LocalizedCardTitle({ children, className }: LocalizedCardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold ${className}`} style={{ color: "var(--text-body)" }}>
      {children}
    </h3>
  );
}

interface LocalizedCardContentProps {
  children: ReactNode;
  className?: string;
}

export function LocalizedCardContent({ children, className }: LocalizedCardContentProps) {
  return (
    <div className={`text-sm ${className}`} style={{ color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

interface LocalizedCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function LocalizedCardFooter({ children, className }: LocalizedCardFooterProps) {
  return (
    <div className={`mt-4 pt-3 border-t ${className}`} style={{ borderColor: "var(--border-subtle)" }}>
      {children}
    </div>
  );
}