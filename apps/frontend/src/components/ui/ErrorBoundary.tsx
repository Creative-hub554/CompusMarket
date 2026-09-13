"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Human-readable label for the section this boundary protects (for logs). */
  label?: string;
  /** When true, the boundary resets its state on key changes (e.g. new feed data). */
  resetKeys?: unknown[];
  /** Custom fallback to show instead of the default recovery UI. */
  fallback?: (props: { error: Error; reset: () => void; label?: string }) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.label ? ` (${this.props.label})` : ""}]`,
      error,
      info.componentStack,
    );
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
          label: this.props.label,
        });
      }
      return (
        <div
          className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] mt-4"
          role="region"
          aria-label="Section unavailable"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-red-500 mb-4">
            <AlertTriangle size={26} />
          </span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
            Couldn&apos;t load this {this.props.label ?? "section"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm">
            Something went wrong rendering this part. It won&apos;t affect the rest of
            the page.
          </p>
          <button
            onClick={this.handleReset}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm"
          >
            <RotateCcw size={15} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
