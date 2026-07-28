import { useState } from "react";
import { TemplateConfig, LayoutType, PhotoStyle } from "./types";

const sample = {
  name: "Sok Vannak",
  title: "Senior Software Engineer",
  summary: "8+ years building scalable web apps with React, Node.js, and cloud technologies.",
  exp: "Tech Solutions Co., Ltd",
  skills: ["React", "Node.js", "TypeScript", "AWS"],
};

function MiniTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 5, padding: "1px 3px", backgroundColor: bg, color, borderRadius: 1, marginRight: 1, marginBottom: 1, display: "inline-block", lineHeight: "7px" }}>
      {label}
    </span>
  );
}

function MiniPhoto({ colors, size = 16, photoStyle }: { colors: TemplateConfig["colors"]; size?: number; photoStyle: PhotoStyle }) {
  if (photoStyle === "none") return null;
  const r = photoStyle === "round-square" ? size * 0.25 : size / 2;
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      backgroundColor: colors.primary, display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.5, fontWeight: 700, color: colors.headerText || "#fff", lineHeight: 1 }}>
        S
      </span>
    </div>
  );
}

function LayoutPreview({ layout, colors, photoStyle = "none" }: { layout: LayoutType; colors: TemplateConfig["colors"]; photoStyle?: PhotoStyle }) {
  const previewStyle: React.CSSProperties = {
    width: "100%", height: 170, position: "relative", overflow: "hidden",
    borderRadius: 6, backgroundColor: colors.background, border: `1px solid ${colors.border}`,
    fontFamily: "system-ui, sans-serif",
  };
  const heading = { fontWeight: 600, color: colors.text, lineHeight: 1.2 };
  const muted = { color: colors.muted, lineHeight: 1.3 };
  const accent = { color: colors.accent, lineHeight: 1.3 };

  switch (layout) {
    case "sidebar-left": {
      const sidebarBg = colors.sidebar || colors.primary;
      const sidebarText = colors.sidebarText || "#ffffff";
      return (
        <div style={previewStyle}>
          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ width: "35%", backgroundColor: sidebarBg, padding: "6px 4px", display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              {photoStyle !== "none" && <MiniPhoto colors={{ ...colors, primary: "#ffffff" }} size={22} photoStyle={photoStyle} />}
              <div style={{ fontSize: 8, fontWeight: 600, color: sidebarText, textAlign: "center" }}>{sample.name}</div>
              <div style={{ fontSize: 5, color: sidebarText + "aa", textAlign: "center" }}>{sample.title}</div>
              <div style={{ borderTop: `1px solid ${sidebarText}33`, margin: "4px 0", width: "100%" }} />
              <div style={{ fontSize: 5, color: sidebarText, textTransform: "uppercase", letterSpacing: 0.5 }}>Skills</div>
              {sample.skills.map((s, i) => (
                <div key={i} style={{ fontSize: 5, color: sidebarText + "bb" }}>{s}</div>
              ))}
            </div>
            <div style={{ flex: 1, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44`, paddingBottom: 2 }}>Summary</div>
              <div style={{ fontSize: 5, ...muted, lineHeight: 1.4 }}>{sample.summary}</div>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44`, paddingBottom: 2, marginTop: 2 }}>Experience</div>
              <div style={{ fontSize: 6, ...heading }}>{sample.exp}</div>
              <div style={{ fontSize: 5, ...muted }}>Led team of 5 developers...</div>
            </div>
          </div>
        </div>
      );
    }
    case "sidebar-right": {
      const sidebarBg = colors.sidebar || colors.primary;
      const sidebarText = colors.sidebarText || "#ffffff";
      return (
        <div style={previewStyle}>
          <div style={{ display: "flex", height: "100%", flexDirection: "row-reverse" }}>
            <div style={{ width: "35%", backgroundColor: sidebarBg, padding: "6px 4px", display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              {photoStyle !== "none" && <MiniPhoto colors={{ ...colors, primary: "#ffffff" }} size={22} photoStyle={photoStyle} />}
              <div style={{ fontSize: 8, fontWeight: 600, color: sidebarText, textAlign: "center" }}>{sample.name}</div>
              <div style={{ fontSize: 5, color: sidebarText + "aa", textAlign: "center" }}>{sample.title}</div>
              <div style={{ borderTop: `1px solid ${sidebarText}33`, margin: "4px 0", width: "100%" }} />
              <div style={{ fontSize: 5, color: sidebarText, textTransform: "uppercase", letterSpacing: 0.5 }}>Skills</div>
              {sample.skills.map((s, i) => (
                <div key={i} style={{ fontSize: 5, color: sidebarText + "bb" }}>{s}</div>
              ))}
            </div>
            <div style={{ flex: 1, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44`, paddingBottom: 2 }}>Summary</div>
              <div style={{ fontSize: 5, ...muted, lineHeight: 1.4 }}>{sample.summary}</div>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44`, paddingBottom: 2, marginTop: 2 }}>Experience</div>
              <div style={{ fontSize: 6, ...heading }}>{sample.exp}</div>
              <div style={{ fontSize: 5, ...muted }}>Led team of 5 developers...</div>
            </div>
          </div>
        </div>
      );
    }
    case "header-card":
      return (
        <div style={previewStyle}>
          <div style={{ backgroundColor: colors.primary, padding: "8px 6px", textAlign: "center" }}>
            {photoStyle !== "none" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <MiniPhoto colors={colors} size={20} photoStyle={photoStyle} />
              </div>
            )}
            <div style={{ fontSize: 9, fontWeight: 600, color: colors.headerText || "#ffffff" }}>{sample.name}</div>
            <div style={{ fontSize: 5, color: (colors.headerText || "#ffffff") + "bb" }}>{sample.title}</div>
          </div>
          <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44` }}>Summary</div>
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 1, marginTop: 2 }}>
              {sample.skills.map((s, i) => (
                <MiniTag key={i} label={s} color={colors.primary} bg={colors.primary + "15"} />
              ))}
            </div>
          </div>
        </div>
      );
    case "compact":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 8, ...heading }}>{sample.name}</div>
            <div style={{ fontSize: 5, ...muted }}>{sample.title}</div>
            <div style={{ borderTop: `1px solid ${colors.accent}44`, margin: "2px 0" }} />
            <div style={{ fontSize: 5, ...muted, lineHeight: 1.3 }}>{sample.summary}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {sample.skills.map((s, i) => (
                <MiniTag key={i} label={s} color={colors.text} bg={colors.muted + "22"} />
              ))}
            </div>
          </div>
        </div>
      );
    case "minimal":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 16, textAlign: "center" }}>
            {photoStyle !== "none" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <MiniPhoto colors={colors} size={24} photoStyle={photoStyle} />
              </div>
            )}
            <div style={{ fontSize: 9, ...heading, marginBottom: 1 }}>{sample.name}</div>
            <div style={{ fontSize: 5, ...muted, marginBottom: 6 }}>{sample.title}</div>
            <div style={{ fontSize: 5, ...muted, lineHeight: 1.4 }}>{sample.summary}</div>
          </div>
        </div>
      );
    case "creative-header":
      return (
        <div style={previewStyle}>
          <div style={{ backgroundColor: colors.header || colors.primary, padding: "8px 6px", textAlign: "center" }}>
            {photoStyle !== "none" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <MiniPhoto colors={colors} size={20} photoStyle={photoStyle} />
              </div>
            )}
            <div style={{ fontSize: 9, fontWeight: 600, color: colors.headerText || "#ffffff" }}>{sample.name}</div>
            <div style={{ fontSize: 5, color: (colors.headerText || "#ffffff") + "bb" }}>{sample.title}</div>
          </div>
          <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ height: 3, backgroundColor: colors.accent + "33" }} />
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {sample.skills.map((s, i) => (
                <MiniTag key={i} label={s} color={colors.primary} bg={colors.primary + "15"} />
              ))}
            </div>
          </div>
        </div>
      );
    case "executive":
      return (
        <div style={previewStyle}>
          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ width: "30%", backgroundColor: colors.primary, padding: 6, display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
              {photoStyle !== "none" && <MiniPhoto colors={{ ...colors, primary: "#ffffff" }} size={20} photoStyle={photoStyle} />}
              <div style={{ fontSize: 7, fontWeight: 600, color: colors.sidebarText || "#fff", textAlign: "center" }}>{sample.name}</div>
              <div style={{ borderTop: `1px solid #ffffff33`, width: "100%" }} />
              <div style={{ fontSize: 5, color: "#ffffffbb" }}>{sample.title}</div>
              <div style={{ fontSize: 5, color: "#ffffff99", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Skills</div>
              {sample.skills.slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: 5, color: "#ffffffcc" }}>{s}</div>
              ))}
            </div>
            <div style={{ flex: 1, padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 5, fontWeight: 600, backgroundColor: colors.primary, color: "#fff", padding: "2px 4px", display: "inline-block", alignSelf: "flex-start" }}>Experience</div>
              <div style={{ fontSize: 6, ...heading }}>{sample.exp}</div>
              <div style={{ fontSize: 5, ...muted }}>Led team of 5 developers...</div>
            </div>
          </div>
        </div>
      );
    case "elegant":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 6, textAlign: "center" }}>
            {photoStyle !== "none" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <MiniPhoto colors={colors} size={22} photoStyle={photoStyle} />
              </div>
            )}
            <div style={{ fontSize: 9, ...heading }}>{sample.name}</div>
            <div style={{ fontSize: 5, fontStyle: "italic", ...muted }}>{sample.title}</div>
            <div style={{ borderBottom: `2px solid ${colors.primary}`, width: "60%", margin: "4px auto" }} />
          </div>
          <div style={{ padding: "0 6px", display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44` }}>Summary</div>
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
          </div>
        </div>
      );
    case "timeline":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 8, ...heading }}>{sample.name}</div>
            <div style={{ fontSize: 5, ...muted }}>{sample.title}</div>
            <div style={{ borderLeft: `2px solid ${colors.accent}`, marginLeft: 4, paddingLeft: 6, marginTop: 2 }}>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.text }}>{sample.exp}</div>
              <div style={{ fontSize: 5, ...muted }}>Led team of 5 developers building microservices.</div>
            </div>
          </div>
        </div>
      );
    case "photo-header":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 6, display: "flex", gap: 6, alignItems: "center" }}>
            {photoStyle !== "none" ? (
              <MiniPhoto colors={colors} size={28} photoStyle={photoStyle} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>S</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 8, ...heading }}>{sample.name}</div>
              <div style={{ fontSize: 5, ...muted }}>{sample.title}</div>
            </div>
          </div>
          <div style={{ padding: "0 6px", display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44` }}>Summary</div>
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
          </div>
        </div>
      );
    case "infographic":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 6 }}>
            <div style={{ fontSize: 8, ...heading }}>{sample.name}</div>
            <div style={{ fontSize: 5, color: colors.accent }}>{sample.title}</div>
            <div style={{ marginTop: 4 }}>
              {sample.skills.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                  <div style={{ fontSize: 4, width: 24, color: colors.muted }}>{s}</div>
                  <div style={{ flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                    <div style={{ width: `${(i + 1) * 20 + 20}%`, height: 4, backgroundColor: colors.accent, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderLeft: `2px solid ${colors.accent}44`, marginTop: 4, paddingLeft: 4 }}>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.text }}>{sample.exp}</div>
              <div style={{ fontSize: 4, ...muted }}>Led team of 5...</div>
            </div>
          </div>
        </div>
      );
    case "two-column":
      return (
        <div style={previewStyle}>
          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ width: "48%", padding: 5, borderRight: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                {photoStyle !== "none" && <MiniPhoto colors={colors} size={16} photoStyle={photoStyle} />}
                <div style={{ fontSize: 7, ...heading }}>{sample.name}</div>
              </div>
              <div style={{ fontSize: 4, ...muted, marginBottom: 4 }}>{sample.title}</div>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44`, marginTop: 4 }}>Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 1, marginTop: 2 }}>
                {sample.skills.map((s, i) => <MiniTag key={i} label={s} color={colors.primary} bg={colors.primary + "15"} />)}
              </div>
            </div>
            <div style={{ width: "48%", padding: 5 }}>
              <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44` }}>Experience</div>
              <div style={{ fontSize: 5, ...heading, marginTop: 3 }}>{sample.exp}</div>
              <div style={{ fontSize: 4, ...muted }}>Led team of 5...</div>
            </div>
          </div>
        </div>
      );
    case "color-block":
      return (
        <div style={previewStyle}>
          <div style={{ backgroundColor: colors.primary, padding: "6px 5px", textAlign: "center" }}>
            {photoStyle !== "none" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>
                <MiniPhoto colors={colors} size={18} photoStyle={photoStyle} />
              </div>
            )}
            <div style={{ fontSize: 8, fontWeight: 600, color: colors.headerText || "#fff" }}>{sample.name}</div>
          </div>
          <div style={{ backgroundColor: colors.primary + "08", padding: 5, fontSize: 5, ...muted }}>{sample.summary}</div>
          <div style={{ padding: "4px 5px", display: "flex", flexWrap: "wrap", gap: 1 }}>
            {sample.skills.map((s, i) => <MiniTag key={i} label={s} color={colors.primary} bg={colors.primary + "15"} />)}
          </div>
        </div>
      );
    case "bordered":
      return (
        <div style={previewStyle}>
          <div style={{ margin: 4, borderWidth: 1, borderColor: colors.primary + "66", borderStyle: "solid", padding: 4, height: "calc(100% - 8px)" }}>
            {photoStyle !== "none" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                <MiniPhoto colors={colors} size={20} photoStyle={photoStyle} />
              </div>
            )}
            <div style={{ fontSize: 8, ...heading, textAlign: "center" }}>{sample.name}</div>
            <div style={{ fontSize: 4, ...muted, textAlign: "center", fontStyle: "italic" }}>{sample.title}</div>
            <div style={{ borderTop: `1px solid ${colors.accent}44`, margin: "3px 0", paddingTop: 3 }}>
              <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
            </div>
          </div>
        </div>
      );
    case "split-header":
      return (
        <div style={previewStyle}>
          <div style={{ backgroundColor: colors.primary, padding: "6px 5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {photoStyle !== "none" && <MiniPhoto colors={colors} size={18} photoStyle={photoStyle} />}
              <div style={{ flex: 1, fontSize: 8, fontWeight: 600, color: colors.headerText || "#fff" }}>{sample.name}</div>
              <div style={{ fontSize: 4, color: (colors.headerText || "#fff") + "bb" }}>{sample.title}</div>
            </div>
            <div style={{ height: 2, backgroundColor: colors.accent, marginTop: 4, width: "40%", borderRadius: 1 }} />
          </div>
          <div style={{ padding: 5 }}>
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
          </div>
        </div>
      );
    case "magazine":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              {photoStyle !== "none" && <MiniPhoto colors={colors} size={16} photoStyle={photoStyle} />}
              <div style={{ fontSize: 8, ...heading, textTransform: "uppercase", letterSpacing: 1 }}>{sample.name}</div>
            </div>
            <div style={{ borderBottom: `2px solid ${colors.accent}`, marginBottom: 4, paddingBottom: 2 }}>
              <div style={{ fontSize: 4, fontStyle: "italic", color: colors.accent }}>{sample.title}</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary, borderBottom: `1px solid ${colors.accent}44` }}>Summary</div>
                <div style={{ fontSize: 4, ...muted, marginTop: 1 }}>{sample.summary}</div>
              </div>
            </div>
          </div>
        </div>
      );
    case "modern-serif":
      return (
        <div style={previewStyle}>
          <div style={{ padding: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {photoStyle !== "none" && <MiniPhoto colors={colors} size={18} photoStyle={photoStyle} />}
              <div>
                <div style={{ fontSize: 8, ...heading }}>{sample.name}</div>
                <div style={{ fontSize: 5, color: colors.accent, fontStyle: "italic" }}>{sample.title}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 2, fontSize: 4, color: colors.muted }}>
              <span>email@example.com</span>
            </div>
          </div>
          <div style={{ padding: "0 6px" }}>
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
          </div>
        </div>
      );
    case "card-style":
      return (
        <div style={previewStyle}>
          <div style={{ padding: "4px 5px", display: "flex", alignItems: "center", gap: 4 }}>
            {photoStyle !== "none" && <MiniPhoto colors={colors} size={16} photoStyle={photoStyle} />}
            <div>
              <div style={{ fontSize: 7, ...heading }}>{sample.name}</div>
              <div style={{ fontSize: 4, ...muted }}>{sample.title}</div>
            </div>
          </div>
          <div style={{ margin: "0 4px 3px", borderWidth: 1, borderColor: colors.border, borderStyle: "solid", borderRadius: 3, padding: 3 }}>
            <div style={{ fontSize: 5, ...muted }}>{sample.summary}</div>
          </div>
          <div style={{ margin: "0 4px", borderWidth: 1, borderColor: colors.border, borderStyle: "solid", borderRadius: 3, padding: 3 }}>
            <div style={{ fontSize: 5, ...heading }}>{sample.exp}</div>
            <div style={{ fontSize: 4, ...muted }}>Led team of 5 developers...</div>
          </div>
        </div>
      );
    case "minimal-sidebar":
      return (
        <div style={previewStyle}>
          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ width: 4, backgroundColor: colors.accent }} />
            <div style={{ flex: 1, padding: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {photoStyle !== "none" && <MiniPhoto colors={colors} size={18} photoStyle={photoStyle} />}
                <div>
                  <div style={{ fontSize: 8, ...heading }}>{sample.name}</div>
                  <div style={{ fontSize: 5, ...muted }}>{sample.title}</div>
                </div>
              </div>
              <div style={{ fontSize: 5, ...muted, marginTop: 4 }}>{sample.summary}</div>
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div style={previewStyle}>
          <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {photoStyle !== "none" && <MiniPhoto colors={colors} size={20} photoStyle={photoStyle} />}
              <div>
                <div style={{ fontSize: 9, ...heading }}>{sample.name}</div>
                <div style={{ fontSize: 5, ...muted }}>{sample.title}</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${colors.accent}44`, margin: "2px 0" }} />
            <div style={{ fontSize: 5, fontWeight: 600, color: colors.primary }}>Summary</div>
            <div style={{ fontSize: 5, ...muted, lineHeight: 1.4 }}>{sample.summary}</div>
            <div style={{ borderTop: `1px solid ${colors.accent}44`, margin: "2px 0" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {sample.skills.map((s, i) => (
                <MiniTag key={i} label={s} color={colors.primary} bg={colors.primary + "15"} />
              ))}
            </div>
          </div>
        </div>
      );
  }
}

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
        <LayoutPreview layout={config.layout} colors={config.colors} photoStyle={config.photoStyle} />
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
