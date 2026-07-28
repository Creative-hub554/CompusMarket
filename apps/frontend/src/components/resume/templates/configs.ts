import { TemplateConfig, LayoutType, HeaderStyle, SectionStyle, SkillsStyle, PhotoStyle } from "../types";

type ColorScheme = {
  id: string;
  suffix: string;
  suffixKm: string;
  colors: {
    primary: string;
    accent: string;
    text: string;
    muted: string;
    background: string;
    border: string;
    sidebar?: string;
    sidebarText?: string;
    header?: string;
    headerText?: string;
  };
};

type LayoutDef = {
  id: string;
  name: string;
  nameKm: string;
  layout: LayoutType;
  headerStyle: HeaderStyle;
  sectionStyle: SectionStyle;
  skillsStyle: SkillsStyle;
  spacing: { padding: number; sectionGap: number; headingSize: number; bodySize: number; nameSize: number };
  showSectionLines: boolean;
  fonts: { heading: string; body: string };
  photoStyle: PhotoStyle;
};

const colorSchemes: ColorScheme[] = [
  {
    id: "blue", suffix: "Blue", suffixKm: "ខៀវ",
    colors: { primary: "#1a237e", accent: "#3b82f6", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#1a237e", sidebarText: "#ffffff", header: "#1a237e", headerText: "#ffffff" },
  },
  {
    id: "khmer", suffix: "Khmer", suffixKm: "ខ្មែរ",
    colors: { primary: "#d42027", accent: "#d4a027", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#b71c1c", sidebarText: "#ffffff", header: "#d42027", headerText: "#ffffff" },
  },
  {
    id: "green", suffix: "Green", suffixKm: "បៃតង",
    colors: { primary: "#1b5e20", accent: "#4caf50", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#1b5e20", sidebarText: "#ffffff", header: "#1b5e20", headerText: "#ffffff" },
  },
  {
    id: "slate", suffix: "Slate", suffixKm: "ប្រផេះ",
    colors: { primary: "#334155", accent: "#64748b", text: "#1e293b", muted: "#64748b", background: "#ffffff", border: "#cbd5e1", sidebar: "#334155", sidebarText: "#f1f5f9", header: "#334155", headerText: "#ffffff" },
  },
  {
    id: "warm", suffix: "Warm", suffixKm: "ក្តៅ",
    colors: { primary: "#92400e", accent: "#d97706", text: "#1c1917", muted: "#78716c", background: "#fefce8", border: "#d6d3d1", sidebar: "#78350f", sidebarText: "#fef3c7", header: "#92400e", headerText: "#fefce8" },
  },
  {
    id: "charcoal", suffix: "Charcoal", suffixKm: "ធ្យូង",
    colors: { primary: "#1e293b", accent: "#475569", text: "#0f172a", muted: "#64748b", background: "#ffffff", border: "#cbd5e1", sidebar: "#1e293b", sidebarText: "#f1f5f9", header: "#1e293b", headerText: "#ffffff" },
  },
  {
    id: "purple", suffix: "Purple", suffixKm: "ស្វាយ",
    colors: { primary: "#7c3aed", accent: "#a855f7", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#6d28d9", sidebarText: "#ffffff", header: "#7c3aed", headerText: "#ffffff" },
  },
  {
    id: "teal", suffix: "Teal", suffixKm: "បៃតងខ្ចី",
    colors: { primary: "#0d9488", accent: "#14b8a6", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#0f766e", sidebarText: "#ffffff", header: "#0d9488", headerText: "#ffffff" },
  },
  {
    id: "coral", suffix: "Coral", suffixKm: "ផ្កាថ្ម",
    colors: { primary: "#e11d48", accent: "#fb7185", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#be123c", sidebarText: "#ffffff", header: "#e11d48", headerText: "#ffffff" },
  },
  {
    id: "navy", suffix: "Navy", suffixKm: "ទ័ពជើងទឹក",
    colors: { primary: "#0f172a", accent: "#334155", text: "#0f172a", muted: "#64748b", background: "#ffffff", border: "#cbd5e1", sidebar: "#0f172a", sidebarText: "#f1f5f9", header: "#0f172a", headerText: "#ffffff" },
  },
  {
    id: "rose", suffix: "Rose", suffixKm: "ផ្កាឈូក",
    colors: { primary: "#be123c", accent: "#e11d48", text: "#1f2937", muted: "#6b7280", background: "#fff1f2", border: "#fecdd3", sidebar: "#9f1239", sidebarText: "#ffffff", header: "#be123c", headerText: "#ffffff" },
  },
  {
    id: "amber", suffix: "Amber", suffixKm: "ពណ៌លឿង",
    colors: { primary: "#b45309", accent: "#d97706", text: "#1c1917", muted: "#78716c", background: "#fffbeb", border: "#fde68a", sidebar: "#92400e", sidebarText: "#fef3c7", header: "#b45309", headerText: "#ffffff" },
  },
  {
    id: "indigo", suffix: "Indigo", suffixKm: "ខៀវចាស់",
    colors: { primary: "#4338ca", accent: "#6366f1", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#3730a3", sidebarText: "#ffffff", header: "#4338ca", headerText: "#ffffff" },
  },
  {
    id: "emerald", suffix: "Emerald", suffixKm: "ត្បូងមរកត",
    colors: { primary: "#047857", accent: "#10b981", text: "#1f2937", muted: "#6b7280", background: "#ffffff", border: "#e5e7eb", sidebar: "#065f46", sidebarText: "#ffffff", header: "#047857", headerText: "#ffffff" },
  },
  {
    id: "stone", suffix: "Stone", suffixKm: "ថ្ម",
    colors: { primary: "#44403c", accent: "#78716c", text: "#1c1917", muted: "#78716c", background: "#fafaf9", border: "#d6d3d1", sidebar: "#44403c", sidebarText: "#f5f5f4", header: "#44403c", headerText: "#ffffff" },
  },
];

const layouts: LayoutDef[] = [
  {
    id: "single-column", name: "Modern", nameKm: "ទំនើប",
    layout: "single-column", headerStyle: "left", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 48, sectionGap: 18, headingSize: 11, bodySize: 10, nameSize: 28 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "sidebar-left", name: "Classic", nameKm: "បុរាណ",
    layout: "sidebar-left", headerStyle: "sidebar", sectionStyle: "accent-bar", skillsStyle: "list",
    spacing: { padding: 24, sectionGap: 16, headingSize: 10, bodySize: 9, nameSize: 22 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "sidebar-right", name: "Mirror", nameKm: "កញ្ចក់",
    layout: "sidebar-right", headerStyle: "left", sectionStyle: "underline", skillsStyle: "list",
    spacing: { padding: 24, sectionGap: 16, headingSize: 10, bodySize: 9, nameSize: 22 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "header-card", name: "Card", nameKm: "កាត",
    layout: "header-card", headerStyle: "centered", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 44, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 26 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "compact", name: "Compact", nameKm: "បង្រួម",
    layout: "compact", headerStyle: "left", sectionStyle: "minimal", skillsStyle: "inline",
    spacing: { padding: 32, sectionGap: 12, headingSize: 10, bodySize: 8, nameSize: 22 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "none",
  },
  {
    id: "minimal", name: "Minimal", nameKm: "តិចតួច",
    layout: "minimal", headerStyle: "centered", sectionStyle: "minimal", skillsStyle: "badges",
    spacing: { padding: 56, sectionGap: 24, headingSize: 11, bodySize: 10, nameSize: 28 },
    showSectionLines: false, fonts: { heading: "Times-Bold", body: "Times-Roman" }, photoStyle: "circle",
  },
  {
    id: "creative-header", name: "Creative", nameKm: "ច្នៃប្រឌិត",
    layout: "creative-header", headerStyle: "banner", sectionStyle: "accent-bar", skillsStyle: "tags",
    spacing: { padding: 36, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 30 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "executive", name: "Executive", nameKm: "ប្រតិបត្តិ",
    layout: "executive", headerStyle: "left", sectionStyle: "filled", skillsStyle: "list",
    spacing: { padding: 36, sectionGap: 16, headingSize: 11, bodySize: 9, nameSize: 22 },
    showSectionLines: false, fonts: { heading: "Times-Bold", body: "Times-Roman" }, photoStyle: "circle",
  },
  {
    id: "elegant", name: "Elegant", nameKm: "ឆើតឆាយ",
    layout: "elegant", headerStyle: "centered", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 48, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 26 },
    showSectionLines: true, fonts: { heading: "Times-Bold", body: "Times-Roman" }, photoStyle: "round-square",
  },
  {
    id: "timeline", name: "Timeline", nameKm: "ពេលវេលា",
    layout: "timeline", headerStyle: "left", sectionStyle: "underline", skillsStyle: "tags",
    spacing: { padding: 40, sectionGap: 16, headingSize: 11, bodySize: 9, nameSize: 24 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "none",
  },
  {
    id: "photo-header", name: "Photo", nameKm: "រូបថត",
    layout: "photo-header", headerStyle: "centered", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 44, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 24 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "infographic", name: "Infographic", nameKm: "ព័ត៌មានវិទ្យា",
    layout: "infographic", headerStyle: "left", sectionStyle: "accent-bar", skillsStyle: "tags",
    spacing: { padding: 36, sectionGap: 16, headingSize: 11, bodySize: 9, nameSize: 26 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "none",
  },
  {
    id: "two-column", name: "Two Column", nameKm: "ពីរជួរ",
    layout: "two-column", headerStyle: "left", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 36, sectionGap: 14, headingSize: 10, bodySize: 8, nameSize: 22 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "color-block", name: "Color Block", nameKm: "ប្លុកពណ៌",
    layout: "color-block", headerStyle: "centered", sectionStyle: "filled", skillsStyle: "badges",
    spacing: { padding: 40, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 26 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "bordered", name: "Bordered", nameKm: "ស៊ុម",
    layout: "bordered", headerStyle: "centered", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 44, sectionGap: 16, headingSize: 11, bodySize: 9, nameSize: 24 },
    showSectionLines: true, fonts: { heading: "Times-Bold", body: "Times-Roman" }, photoStyle: "round-square",
  },
  {
    id: "split-header", name: "Split", nameKm: "បំបែក",
    layout: "split-header", headerStyle: "banner", sectionStyle: "underline", skillsStyle: "tags",
    spacing: { padding: 36, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 28 },
    showSectionLines: true, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "magazine", name: "Magazine", nameKm: "ទស្សនាវដ្ដី",
    layout: "magazine", headerStyle: "left", sectionStyle: "accent-bar", skillsStyle: "inline",
    spacing: { padding: 40, sectionGap: 18, headingSize: 12, bodySize: 9, nameSize: 30 },
    showSectionLines: false, fonts: { heading: "Times-Bold", body: "Helvetica" }, photoStyle: "round-square",
  },
  {
    id: "modern-serif", name: "Serif", nameKm: "សេរីហ្វ",
    layout: "modern-serif", headerStyle: "centered", sectionStyle: "minimal", skillsStyle: "badges",
    spacing: { padding: 48, sectionGap: 20, headingSize: 11, bodySize: 9, nameSize: 26 },
    showSectionLines: false, fonts: { heading: "Times-Bold", body: "Times-Roman" }, photoStyle: "circle",
  },
  {
    id: "card-style", name: "Cards", nameKm: "កាតរៀង",
    layout: "card-style", headerStyle: "left", sectionStyle: "underline", skillsStyle: "badges",
    spacing: { padding: 40, sectionGap: 18, headingSize: 11, bodySize: 9, nameSize: 24 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
  {
    id: "minimal-sidebar", name: "Side Accent", nameKm: "គែមចំហៀង",
    layout: "minimal-sidebar", headerStyle: "left", sectionStyle: "minimal", skillsStyle: "inline",
    spacing: { padding: 40, sectionGap: 16, headingSize: 11, bodySize: 9, nameSize: 24 },
    showSectionLines: false, fonts: { heading: "Helvetica-Bold", body: "Helvetica" }, photoStyle: "circle",
  },
];

function buildConfig(layout: LayoutDef, scheme: ColorScheme): TemplateConfig {
  return {
    id: `${layout.id}-${scheme.id}`,
    name: `${layout.name} ${scheme.suffix}`,
    nameKm: `${layout.nameKm} ${scheme.suffixKm}`,
    layout: layout.layout,
    colors: { ...scheme.colors },
    fonts: { ...layout.fonts },
    spacing: { ...layout.spacing },
    showSectionLines: layout.showSectionLines,
    headerStyle: layout.headerStyle,
    sectionStyle: layout.sectionStyle,
    skillsStyle: layout.skillsStyle,
    photoStyle: layout.photoStyle,
  };
}

export const templateConfigs: TemplateConfig[] = layouts.flatMap((layout) =>
  colorSchemes.map((scheme) => buildConfig(layout, scheme))
);
