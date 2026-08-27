"use client";

import { useLocale, useTranslations } from "next-intl";
import { FormHTMLAttributes, ReactNode, forwardRef } from "react";

interface LocalizedFormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  className?: string;
}

export const LocalizedForm = forwardRef<HTMLFormElement, LocalizedFormProps>(
  ({ className, children, ...props }, ref) => {
    const locale = useLocale();
    const t = useTranslations("form");

    return (
      <form
        ref={ref}
        className={`space-y-4 ${className}`}
        style={{
          backgroundColor: "var(--surface)",
          border: `1px solid var(--border-subtle)`,,
          borderRadius: "0.75rem",
          padding: "1.5rem",
        }}
        {...props}
      >
        {children}
      </form>
    );
  }
);

interface LocalizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const LocalizedInput = forwardRef<HTMLInputElement, LocalizedInputProps>(
  ({ label, error, className, ...props }, ref) => {
    const locale = useLocale();
    const t = useTranslations("form");

    return (
      <div className="space-y-2">
        {label && (
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--text-body)" }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 rounded-lg border transition-colors ${className} ${
            error
              ? "border-red-500 focus:border-red-600"
              : "border-gray-300 focus:border-blue-500"
          }`}
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--text-body)",
          }}
          {...props}
        />
        {error && (
          <p className="text-sm" style={{ color: "var(--red-600)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

interface LocalizedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export const LocalizedSelect = forwardRef<HTMLSelectElement, LocalizedSelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    const locale = useLocale();
    const t = useTranslations("form");

    return (
      <div className="space-y-2">
        {label && (
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--text-body)" }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-3 py-2 rounded-lg border transition-colors ${className} ${
            error
              ? "border-red-500 focus:border-red-600"
              : "border-gray-300 focus:border-blue-500"
          }`}
          style={{
            backgroundColor: "var(--surface)",
            color: "var(--text-body)",
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm" style={{ color: "var(--red-600)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);