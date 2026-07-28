"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

import { templateConfigs } from "./templates/configs";
import TemplatePreviewCard from "./TemplatePreviewCard";
import TemplatePdfPreview from "./TemplatePdfPreview";

const layoutFilters: { key: string; labelEn: string; labelKm: string }[] = [
  { key: "all", labelEn: "All", labelKm: "ទាំងអស់" },
  { key: "single-column", labelEn: "Modern", labelKm: "ទំនើប" },
  { key: "sidebar-left", labelEn: "Classic", labelKm: "បុរាណ" },
  { key: "sidebar-right", labelEn: "Mirror", labelKm: "កញ្ចក់" },
  { key: "header-card", labelEn: "Card", labelKm: "កាត" },
  { key: "compact", labelEn: "Compact", labelKm: "បង្រួម" },
  { key: "minimal", labelEn: "Minimal", labelKm: "តិចតួច" },
  { key: "creative-header", labelEn: "Creative", labelKm: "ច្នៃប្រឌិត" },
  { key: "executive", labelEn: "Executive", labelKm: "ប្រតិបត្តិ" },
  { key: "elegant", labelEn: "Elegant", labelKm: "ឆើតឆាយ" },
  { key: "timeline", labelEn: "Timeline", labelKm: "ពេលវេលា" },
  { key: "photo-header", labelEn: "Photo", labelKm: "រូបថត" },
  { key: "infographic", labelEn: "Infographic", labelKm: "ព័ត៌មានវិទ្យា" },
  { key: "two-column", labelEn: "Two Column", labelKm: "ពីរជួរ" },
  { key: "color-block", labelEn: "Color Block", labelKm: "ប្លុកពណ៌" },
  { key: "bordered", labelEn: "Bordered", labelKm: "ស៊ុម" },
  { key: "split-header", labelEn: "Split", labelKm: "បំបែក" },
  { key: "magazine", labelEn: "Magazine", labelKm: "ទស្សនាវដ្ដី" },
  { key: "modern-serif", labelEn: "Serif", labelKm: "សេរីហ្វ" },
  { key: "card-style", labelEn: "Cards", labelKm: "កាតរៀង" },
  { key: "minimal-sidebar", labelEn: "Side Accent", labelKm: "គែមចំហៀង" },
];

const colorFilters: { key: string; labelEn: string; labelKm: string; color: string }[] = [
  { key: "all", labelEn: "All", labelKm: "ទាំងអស់", color: "#6b7280" },
  { key: "blue", labelEn: "Blue", labelKm: "ខៀវ", color: "#1a237e" },
  { key: "khmer", labelEn: "Khmer", labelKm: "ខ្មែរ", color: "#d42027" },
  { key: "green", labelEn: "Green", labelKm: "បៃតង", color: "#1b5e20" },
  { key: "slate", labelEn: "Slate", labelKm: "ប្រផេះ", color: "#334155" },
  { key: "warm", labelEn: "Warm", labelKm: "ក្តៅ", color: "#92400e" },
  { key: "charcoal", labelEn: "Charcoal", labelKm: "ធ្យូង", color: "#1e293b" },
  { key: "purple", labelEn: "Purple", labelKm: "ស្វាយ", color: "#7c3aed" },
  { key: "teal", labelEn: "Teal", labelKm: "បៃតងខ្ចី", color: "#0d9488" },
  { key: "coral", labelEn: "Coral", labelKm: "ផ្កាថ្ម", color: "#e11d48" },
  { key: "navy", labelEn: "Navy", labelKm: "ទ័ពជើងទឹក", color: "#0f172a" },
  { key: "rose", labelEn: "Rose", labelKm: "ផ្កាឈូក", color: "#be123c" },
  { key: "amber", labelEn: "Amber", labelKm: "លឿង", color: "#b45309" },
  { key: "indigo", labelEn: "Indigo", labelKm: "ខៀវចាស់", color: "#4338ca" },
  { key: "emerald", labelEn: "Emerald", labelKm: "មរកត", color: "#047857" },
  { key: "stone", labelEn: "Stone", labelKm: "ថ្ម", color: "#44403c" },
];

type Props = {
  open: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  locale: "en" | "km";
};

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export default function TemplateGallery({ open, selectedId, onSelect, onClose, locale }: Props) {
  const [layoutFilter, setLayoutFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [pendingId, setPendingId] = useState(selectedId);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);

  const filtered = useMemo(() => {
    return templateConfigs.filter((cfg) => {
      if (layoutFilter !== "all" && cfg.layout !== layoutFilter) return false;
      if (colorFilter !== "all") {
        const scheme = cfg.id.split("-").pop();
        if (scheme !== colorFilter) return false;
      }
      return true;
    });
  }, [layoutFilter, colorFilter]);

  const previewIndex = useMemo(() => {
    if (!previewId) return -1;
    return filtered.findIndex((c) => c.id === previewId);
  }, [previewId, filtered]);

  const currentConfig = previewIndex >= 0 ? filtered[previewIndex] : null;

  const goNext = useCallback(() => {
    if (previewIndex < filtered.length - 1) {
      setAnimDir("right");
      setPreviewId(filtered[previewIndex + 1].id);
    }
  }, [previewIndex, filtered]);

  const goPrev = useCallback(() => {
    if (previewIndex > 0) {
      setAnimDir("left");
      setPreviewId(filtered[previewIndex - 1].id);
    }
  }, [previewIndex, filtered]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!previewId) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setPreviewId(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewId, goNext, goPrev]);

  useEffect(() => {
    if (open) {
      setPendingId(selectedId);
      setPreviewId(null);
    }
  }, [open, selectedId]);

  if (!open) return null;

  function handleConfirm() {
    onSelect(pendingId);
    onClose();
  }

  function openPreview(id: string) {
    setPreviewId(id);
    setAnimDir(null);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      animation: "fadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
      <div style={{
        backgroundColor: "#fff", width: "95vw", maxWidth: 1200, maxHeight: "90vh",
        borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        animation: "slideUp 0.25s ease",
      }}>
        <div style={{
          background: `linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)`,
          padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>
              {locale === "km" ? "បណ្ណាល័យគំរូ" : "Template Library"}
            </h2>
            <p style={{ fontSize: 13, color: "#ffffffaa", margin: "4px 0 0" }}>
              {locale === "km"
                ? `កំពុងបង្ហាញ ${filtered.length} គំរូ`
                : `${filtered.length} templates available`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
              width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 18, transition: "background 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {previewId && currentConfig ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 28px", borderBottom: "1px solid #f0f0f0",
              background: "#fafbfc",
            }}>
              <button
                onClick={() => setPreviewId(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#6b7280", fontWeight: 500, padding: "4px 8px",
                  borderRadius: 8, transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <GridIcon />
                {locale === "km" ? "ត្រឡប់" : "Gallery"}
              </button>
              <div style={{ width: 1, height: 20, backgroundColor: "#e5e7eb" }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: "#1f2937" }}>
                {locale === "km" ? currentConfig.nameKm : currentConfig.name}
              </span>
              <div style={{
                display: "flex", gap: 8, marginLeft: "auto", alignItems: "center",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 12, color: "#6b7280", background: "#f3f4f6",
                  padding: "3px 10px", borderRadius: 6,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    backgroundColor: currentConfig.colors.primary, display: "inline-block",
                  }} />
                  {layoutFilters.find((f) => f.key === currentConfig.layout) ?
                    (locale === "km"
                      ? layoutFilters.find((f) => f.key === currentConfig.layout)!.labelKm
                      : layoutFilters.find((f) => f.key === currentConfig.layout)!.labelEn)
                    : currentConfig.layout}
                </div>
                <span style={{
                  fontSize: 12, color: "#9ca3af",
                  background: "#f3f4f6", padding: "3px 10px", borderRadius: 6,
                }}>
                  {previewIndex + 1} / {filtered.length}
                </span>
              </div>
            </div>

            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24, position: "relative", overflow: "hidden",
              background: "linear-gradient(135deg, #f8f9fb 0%, #eef1f5 100%)",
            }}>
              {filtered.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    disabled={previewIndex === 0}
                    style={{
                      position: "absolute", left: 16, zIndex: 10,
                      width: 44, height: 44, borderRadius: "50%",
                      background: previewIndex === 0 ? "rgba(255,255,255,0.5)" : "#fff",
                      border: "none", cursor: previewIndex === 0 ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: previewIndex === 0 ? "#d1d5db" : "#374151",
                      boxShadow: previewIndex === 0 ? "none" : "0 2px 12px rgba(0,0,0,0.12)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (previewIndex > 0) {
                        e.currentTarget.style.background = "#f8f8f8";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <ArrowLeftIcon />
                  </button>
                  <button
                    onClick={goNext}
                    disabled={previewIndex === filtered.length - 1}
                    style={{
                      position: "absolute", right: 16, zIndex: 10,
                      width: 44, height: 44, borderRadius: "50%",
                      background: previewIndex === filtered.length - 1 ? "rgba(255,255,255,0.5)" : "#fff",
                      border: "none", cursor: previewIndex === filtered.length - 1 ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: previewIndex === filtered.length - 1 ? "#d1d5db" : "#374151",
                      boxShadow: previewIndex === filtered.length - 1 ? "none" : "0 2px 12px rgba(0,0,0,0.12)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (previewIndex < filtered.length - 1) {
                        e.currentTarget.style.background = "#f8f8f8";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <ArrowRightIcon />
                  </button>
                </>
              )}
              <div style={{
                width: "100%", maxWidth: 560, height: "65vh",
                animation: animDir === "left" ? "slideRight 0.2s ease" : animDir === "right" ? "slideLeft 0.2s ease" : "none",
              }}>
                <TemplatePdfPreview config={currentConfig} />
              </div>
            </div>

            <div style={{
              display: "flex", justifyContent: "center", gap: 10,
              padding: "14px 28px", borderTop: "1px solid #f0f0f0",
              background: "#fafbfc",
            }}>
              <button
                onClick={() => { onSelect(previewId); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 32px", fontSize: 14, borderRadius: 10, border: "none",
                  cursor: "pointer", backgroundColor: "#1a237e", color: "#fff", fontWeight: 600,
                  transition: "background 0.15s, transform 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#283593";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1a237e";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <CheckIcon />
                {locale === "km" ? "ជ្រើសរើសគំរូនេះ" : "Select This Template"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              padding: "16px 28px", borderBottom: "1px solid #f0f0f0",
              background: "#fafbfc",
            }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {layoutFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setLayoutFilter(f.key)}
                    style={{
                      padding: "5px 14px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer",
                      fontWeight: layoutFilter === f.key ? 600 : 400,
                      backgroundColor: layoutFilter === f.key ? "#1a237e" : "#f3f4f6",
                      color: layoutFilter === f.key ? "#fff" : "#4b5563",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (layoutFilter !== f.key) e.currentTarget.style.background = "#e5e7eb";
                    }}
                    onMouseLeave={(e) => {
                      if (layoutFilter !== f.key) e.currentTarget.style.background = "#f3f4f6";
                    }}
                  >
                    {locale === "km" ? f.labelKm : f.labelEn}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {colorFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setColorFilter(f.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 14px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer",
                      fontWeight: colorFilter === f.key ? 600 : 400,
                      backgroundColor: colorFilter === f.key ? f.color + "18" : "#f3f4f6",
                      color: colorFilter === f.key ? f.color : "#4b5563",
                      transition: "all 0.15s",
                      outline: colorFilter === f.key ? `1.5px solid ${f.color}` : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (colorFilter !== f.key) e.currentTarget.style.background = "#e5e7eb";
                    }}
                    onMouseLeave={(e) => {
                      if (colorFilter !== f.key) e.currentTarget.style.background = "#f3f4f6";
                    }}
                  >
                    {f.key !== "all" && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: f.color }} />
                    )}
                    {locale === "km" ? f.labelKm : f.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              flex: 1, overflowY: "auto", padding: "20px 28px",
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 20,
            }}>
              {filtered.map((cfg) => (
                <TemplatePreviewCard
                  key={cfg.id}
                  config={cfg}
                  selected={pendingId === cfg.id}
                  onClick={() => {
                    setPendingId(cfg.id);
                    openPreview(cfg.id);
                  }}
                  locale={locale}
                />
              ))}
              {filtered.length === 0 && (
                <div style={{
                  gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px",
                  color: "#9ca3af", fontSize: 14,
                }}>
                  {locale === "km" ? "មិនមានគំរូដែលត្រូវគ្នាទេ" : "No matching templates"}
                </div>
              )}
            </div>

            <div style={{
              display: "flex", justifyContent: "flex-end", gap: 8,
              padding: "14px 28px", borderTop: "1px solid #f0f0f0",
              background: "#fafbfc",
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 24px", fontSize: 13, borderRadius: 10, border: "1px solid #d1d5db",
                  cursor: "pointer", backgroundColor: "#fff", color: "#4b5563", fontWeight: 500,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
              >
                {locale === "km" ? "បោះបង់" : "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 24px", fontSize: 13, borderRadius: 10, border: "none",
                  cursor: "pointer", backgroundColor: "#1a237e", color: "#fff", fontWeight: 600,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#283593"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#1a237e"}
              >
                <CheckIcon />
                {locale === "km" ? "ជ្រើសរើស" : "Select Template"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
