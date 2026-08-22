"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
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

function Placeholder() {
  return (
    <div style={{
      width: "100%", height: "100%", borderRadius: 10,
      backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center",
      color: "#d1d5db",
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="13" y2="13" />
      </svg>
    </div>
  );
}

async function renderTemplatePreview(configId: string): Promise<string> {
  const [{ pdf }, { default: ResumePDF }, pdfjs] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/ResumePDF"),
    import("pdfjs-dist"),
  ]);

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const blob = await pdf(
    <ResumePDF data={sampleResume} template={configId} locale="en" />
  ).toBlob();
  const data = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL("image/png");
  } finally {
    await loadingTask.destroy();
  }
}

export default function TemplatePdfPreview({ config, onLoad }: Props) {
  const [url, setUrl] = useState<string | null>(cache.get(config.id) || null);
  const [loading, setLoading] = useState(!cache.has(config.id));
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    mountedRef.current = true;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setInView(true);
        });
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const cached = cache.get(config.id);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      onLoadRef.current?.();
      return;
    }

    setLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const png = await renderTemplatePreview(config.id);
        if (!cancelled && mountedRef.current) {
          cache.set(config.id, png);
          setUrl(png);
          setLoading(false);
          onLoadRef.current?.();
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
  }, [config.id, inView]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {!inView ? <Placeholder /> : loading ? <Skeleton /> : !url ? (
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
      ) : (
        <Image
          src={url}
          alt={config.name}
          width={400}
          height={566}
          unoptimized
          style={{
            width: "100%", height: "100%", objectFit: "contain", borderRadius: 10,
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            backgroundColor: "#fff",
          }}
        />
      )}
    </div>
  );
}
