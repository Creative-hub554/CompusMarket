export type ResumeData = {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    title: string;
    summary: string;
  };
  education: {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }[];
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  skills: string[];
  certifications: { id: string; name: string; issuer: string; date: string }[];
  languages: { id: string; name: string; level: string }[];
};

export type ResumeTemplateId = string;

export type LayoutType =
  | "single-column"
  | "sidebar-left"
  | "sidebar-right"
  | "header-card"
  | "compact"
  | "minimal"
  | "creative-header"
  | "executive"
  | "elegant"
  | "timeline"
  | "photo-header"
  | "infographic"
  | "two-column"
  | "color-block"
  | "bordered"
  | "split-header"
  | "magazine"
  | "modern-serif"
  | "card-style"
  | "minimal-sidebar";

export type HeaderStyle = "centered" | "left" | "sidebar" | "banner";
export type SectionStyle = "underline" | "filled" | "accent-bar" | "minimal";
export type SkillsStyle = "badges" | "list" | "inline" | "tags";
export type PhotoStyle = "none" | "circle" | "round-square";

export type TemplateConfig = {
  id: string;
  name: string;
  nameKm: string;
  layout: LayoutType;
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
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    padding: number;
    sectionGap: number;
    headingSize: number;
    bodySize: number;
    nameSize: number;
  };
  showSectionLines: boolean;
  headerStyle: HeaderStyle;
  sectionStyle: SectionStyle;
  skillsStyle: SkillsStyle;
  photoStyle: PhotoStyle;
};

export type ResumeTemplate = {
  id: ResumeTemplateId;
  name: string;
  nameKm: string;
  config: TemplateConfig;
  component: React.ComponentType<{ data: ResumeData; config: TemplateConfig; locale?: "en" | "km" }>;
};
