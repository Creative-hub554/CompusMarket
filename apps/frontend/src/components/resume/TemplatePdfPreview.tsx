"use client";

import { useEffect, useState, useRef } from "react";
import { TemplateConfig } from "./types";
import { sampleResume } from "./utils";

const cache = new Map<string, string>();

type Props = {
  config: TemplateConfig;
  onLoad?: () => void;
};

function Skeleton() {
  return (
    <div style={{
      width: "100%", height: "100%", borderRadius: 10,
      background: "linear-gradient(135deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
      backgroundSize: "200% 200%",
      animation: "shimmer 1.5s ease-in-out infinite",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 12,
    }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ width: 40, height: 40, border: "3px solid #d1d5db", borderTopColor: "#6b7280", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>Generating preview...</span>
    </div>
  );
}

export default function TemplatePdfPreview({ config, onLoad }: Props) {
  const [url, setUrl] = useState<string | null>(cache.get(config.id) || null);
  const [loading, setLoading] = useState(!cache.has(config.id));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const cached = cache.get(config.id);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      onLoad?.();
      return;
    }

    setLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const { pdf } = await import("@react-pdf/renderer");
        const { default: ResumePDF } = await import(
          "@/components/ResumePDF"
        );

        const blob = await pdf(
          <ResumePDF data={sampleResume} template={config.id} locale="en" />
        ).toBlob();
        const objectUrl = URL.createObjectURL(blob);

        if (!cancelled && mountedRef.current) {
          cache.set(config.id, objectUrl);
          setUrl(objectUrl);
          setLoading(false);
          onLoad?.();
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.id, onLoad]);

  if (loading) return <Skeleton />;

  if (!url) {
    return (
      <div style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 8,
        backgroundColor: "#f9fafb", borderRadius: 10, color: "#9ca3af", fontSize: 13,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="13" y2="13" />
        </svg>
        Preview unavailable
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={config.name}
      style={{
        width: "100%", height: "100%", objectFit: "contain", borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
        backgroundColor: "#fff",
      }}
    />
  );
}
