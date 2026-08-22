"use client";

import { useEffect, useRef, useState } from "react";
import type Mermaid from "mermaid";

let mermaidPromise: Promise<typeof Mermaid> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => mod.default);
  }
  return mermaidPromise;
}

export function MermaidPreview({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ref.current || !code.trim()) return;
    setError(null);
    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return;
        mermaid.initialize({ theme: dark ? "dark" : "default", securityLevel: "strict" });
        if (!ref.current) return;
        ref.current.innerHTML = "";
        const el = document.createElement("div");
        el.className = "mermaid";
        el.textContent = code;
        ref.current.appendChild(el);
        return mermaid.run({ nodes: [el] }).catch((e) => {
          if (!cancelled) setError(e.message || "Invalid diagram syntax");
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load diagram renderer");
      });
    return () => {
      cancelled = true;
    };
  }, [code, dark]);

  function getErrorHint(msg: string): string {
    if (msg.includes("syntax")) return "Check for missing quotes, brackets, or arrows.";
    if (msg.includes("parse")) return "The diagram structure may be incorrect. Try simplifying.";
    return "Refer to Mermaid.js documentation for correct syntax.";
  }

  if (!code.trim()) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
          <p className="text-sm">Enter diagram code to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</span>
        <button
          onClick={() => setDark(!dark)}
          className="text-xs px-2.5 py-1 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-1.5"
        >
          {dark ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Light
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              Dark
            </>
          )}
        </button>
      </div>
      <div className={`p-6 min-h-64 flex items-center justify-center overflow-auto transition-colors ${dark ? "bg-gray-900" : "bg-white"}`}>
        {error ? (
          <div className="text-red-500 text-sm text-center max-w-md">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <p className="font-medium mb-1">Syntax Error</p>
            <p className="text-xs mb-2 text-red-400 font-mono">{error}</p>
            <p className="text-xs text-gray-400">{getErrorHint(error)}</p>
          </div>
        ) : (
          <div ref={ref} className="[&_svg]:max-w-full" />
        )}
      </div>
    </div>
  );
}
