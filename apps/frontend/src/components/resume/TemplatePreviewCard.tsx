import { useState } from "react";
import { TemplateConfig } from "./types";
import TemplatePdfPreview from "./TemplatePdfPreview";

type Props = {
  config: TemplateConfig;
  selected: boolean;
  onClick: () => void;
  locale: "en" | "km";
};

export default function TemplatePreviewCard({ config, selected, onClick, locale }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", cursor: "pointer", textAlign: "left", background: "none", border: "none", padding: 0,
        position: "relative",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        filter: hovered ? "drop-shadow(0 8px 16px rgba(0,0,0,0.12))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.06))",
      }}
    >
      <div style={{
        backgroundColor: "#fff", borderRadius: 10,
        border: selected ? `2px solid ${config.colors.primary}` : "2px solid #e5e7eb",
        overflow: "hidden",
        boxShadow: selected
          ? `0 0 0 3px ${config.colors.primary}22, 0 4px 12px rgba(0,0,0,0.08)`
          : hovered
            ? "0 4px 12px rgba(0,0,0,0.1)"
            : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s ease",
      }}>
        <div style={{ height: 170, padding: 6, backgroundColor: "#f8f9fb", borderBottom: "1px solid #f0f0f0" }}>
          <TemplatePdfPreview config={config} />
        </div>
        <div style={{
          padding: "8px 10px 10px", borderTop: "1px solid #f3f4f6",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: config.colors.primary, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 12, fontWeight: selected ? 600 : 500,
              color: selected ? config.colors.primary : "#1f2937",
              lineHeight: 1.3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {locale === "km" ? config.nameKm : config.name}
            </span>
          </div>
        </div>
      </div>

      {selected && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 22, height: 22, borderRadius: "50%",
          backgroundColor: config.colors.primary,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
}
