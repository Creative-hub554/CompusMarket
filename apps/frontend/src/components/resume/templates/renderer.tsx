import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ResumeData, TemplateConfig, LayoutType, PhotoStyle } from "../types";
import { formatDate, getResumeLabels, ResumeLabels } from "../utils";

function PhotoView({ data, config, size = 50 }: { data: ResumeData; config: TemplateConfig; size?: number }) {
  if (config.photoStyle === "none") return null;
  const initial = (data.personalInfo?.fullName || "?")[0].toUpperCase();
  const borderRadius = config.photoStyle === "round-square" ? size * 0.25 : size / 2;
  return (
    <View style={{
      width: size, height: size, borderRadius, backgroundColor: config.colors.primary,
      justifyContent: "center", alignItems: "center", flexShrink: 0,
    }}>
      <Text style={{ fontSize: size * 0.45, color: config.colors.headerText || "#ffffff", fontFamily: config.fonts.heading }}>
        {initial}
      </Text>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  page: { fontSize: 10 },
  pageRow: { fontSize: 10, flexDirection: "row" },
  flexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  flexCol: { flexDirection: "column" },
  flexWrap: { flexDirection: "row", flexWrap: "wrap" },
  gap1: { gap: 4 },
  gap2: { gap: 2 },
});

function SectionTitle({ title, config }: { title: string; config: TemplateConfig }) {
  const { colors, spacing, sectionStyle, showSectionLines, fonts } = config;
  const titleStyle: any = {
    fontSize: spacing.headingSize,
    fontFamily: fonts.heading,
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingBottom: showSectionLines ? 4 : 0,
  };

  if (sectionStyle === "underline") {
    titleStyle.borderBottomWidth = 1;
    titleStyle.borderBottomColor = colors.accent + "66";
    titleStyle.paddingBottom = 4;
  } else if (sectionStyle === "filled") {
    titleStyle.backgroundColor = colors.primary;
    titleStyle.color = "#ffffff";
    titleStyle.padding = "3 8";
    titleStyle.marginBottom = 10;
    titleStyle.borderRadius = 2;
  } else if (sectionStyle === "accent-bar") {
    titleStyle.borderBottomWidth = 2;
    titleStyle.borderBottomColor = colors.accent;
    titleStyle.paddingBottom = 3;
    titleStyle.marginBottom = 10;
  } else if (sectionStyle === "minimal") {
    titleStyle.color = colors.muted;
    titleStyle.letterSpacing = 1.5;
  }

  return <Text style={titleStyle}>{title}</Text>;
}

function SectionBlock({ title, children, config }: { title: string; children: React.ReactNode; config: TemplateConfig }) {
  return (
    <View style={{ marginBottom: config.spacing.sectionGap }}>
      <SectionTitle title={title} config={config} />
      {children}
    </View>
  );
}

function HeaderSection({ data, config }: { data: ResumeData; config: TemplateConfig }) {
  const info = data.personalInfo || {};
  const { colors, spacing, headerStyle, fonts } = config;
  const isCentered = headerStyle === "centered" || headerStyle === "banner";
  const isBanner = headerStyle === "banner";

  if (headerStyle === "sidebar") {
    return (
      <View>
        <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: "#ffffff", marginBottom: 2 }}>{info.fullName || "Your Name"}</Text>
        {info.title && <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>{info.title}</Text>}
        <Text style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginTop: 8, marginBottom: 2 }}>Contact</Text>
        {info.email && <Text style={{ fontSize: 9, color: "#cbd5e1", marginBottom: 3 }}>{info.email}</Text>}
        {info.phone && <Text style={{ fontSize: 9, color: "#cbd5e1", marginBottom: 3 }}>{info.phone}</Text>}
        {info.address && <Text style={{ fontSize: 9, color: "#cbd5e1", marginBottom: 3 }}>{info.address}</Text>}
      </View>
    );
  }

  const headerBg = isBanner ? (colors.header || colors.primary) : "transparent";
  const headerTxt = isBanner ? (colors.headerText || "#ffffff") : colors.text;
  const nameOnly = isBanner && !info.title;
  const showPhoto = config.photoStyle !== "none";

  return (
    <View style={{
      marginBottom: spacing.sectionGap,
      backgroundColor: headerBg,
      padding: isBanner ? spacing.padding : 0,
      paddingTop: isBanner ? spacing.padding - 4 : 0,
      paddingBottom: isBanner ? spacing.padding - 8 : 0,
      marginLeft: isBanner ? -spacing.padding : 0,
      marginRight: isBanner ? -spacing.padding : 0,
      paddingLeft: isBanner ? spacing.padding : 0,
      paddingRight: isBanner ? spacing.padding : 0,
    }}>
      <View style={{ flexDirection: isCentered ? "column" : "row", alignItems: isCentered ? "center" : "flex-start", gap: showPhoto ? 14 : 0 }}>
        {showPhoto && <PhotoView data={data} config={config} size={isBanner ? 56 : 50} />}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: spacing.nameSize,
            fontFamily: fonts.heading,
            fontWeight: "bold",
            color: headerTxt,
            textAlign: isCentered ? "center" : "left",
            marginBottom: nameOnly ? 0 : 4,
          }}>
            {info.fullName || "Your Name"}
          </Text>
          {info.title && (
            <Text style={{
              fontSize: 14,
              color: isBanner ? headerTxt + "cc" : colors.muted,
              textAlign: isCentered ? "center" : "left",
              marginBottom: 8,
            }}>
              {info.title}
            </Text>
          )}
          {!isBanner && (
            <View style={[staticStyles.flexRow, { flexWrap: "wrap", gap: 2 }]}>
              {info.email && <Text style={{ fontSize: 8, color: colors.muted }}>{info.email}</Text>}
              {info.phone && <Text style={{ fontSize: 8, color: colors.muted }}>  {info.phone}</Text>}
              {info.address && <Text style={{ fontSize: 8, color: colors.muted }}>  {info.address}</Text>}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function SummarySection({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const summary = data.personalInfo?.summary;
  if (!summary) return null;
  const labels = getResumeLabels(locale);
  return (
    <SectionBlock title={labels.summary} config={config}>
      <Text style={{ fontSize: config.spacing.bodySize, color: config.colors.muted, lineHeight: 1.4 }}>{summary}</Text>
    </SectionBlock>
  );
}

function ExperienceSection({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  if (!data.experience || data.experience.length === 0) return null;
  const { colors, spacing, fonts } = config;
  const bodySize = spacing.bodySize;
  const isTimeline = config.layout === "timeline";
  const labels = getResumeLabels(locale);

  return (
    <SectionBlock title={labels.experience} config={config}>
      {data.experience.map((exp, i) => (
        <View key={i} style={{ marginBottom: 8, ...(isTimeline ? { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.accent, marginLeft: 4 } : {}) }}>
          {isTimeline && (
            <View style={{ position: "absolute", left: -4, top: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
          )}
          <View style={staticStyles.flexRow}>
            <Text style={{ fontSize: bodySize + 1, fontFamily: fonts.heading, color: colors.text }}>{exp.position}</Text>
            <Text style={{ fontSize: bodySize - 2, color: colors.muted + "aa" }}>
              {formatDate(exp.startDate, locale)} - {formatDate(exp.endDate, locale) || labels.present}
            </Text>
          </View>
          <Text style={{ fontSize: bodySize, color: colors.muted, marginBottom: 2 }}>{exp.company}</Text>
          {exp.description && (
            <Text style={{ fontSize: bodySize - 1, color: colors.muted, lineHeight: 1.4, marginTop: 2 }}>{exp.description}</Text>
          )}
        </View>
      ))}
    </SectionBlock>
  );
}

function EducationSection({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  if (!data.education || data.education.length === 0) return null;
  const { colors, spacing, fonts } = config;
  const bodySize = spacing.bodySize;
  const labels = getResumeLabels(locale);

  return (
    <SectionBlock title={labels.education} config={config}>
      {data.education.map((edu, i) => (
        <View key={i} style={{ marginBottom: 6 }}>
          <View style={staticStyles.flexRow}>
            <Text style={{ fontSize: bodySize + 1, fontFamily: fonts.heading, color: colors.text }}>{edu.institution}</Text>
            <Text style={{ fontSize: bodySize - 2, color: colors.muted + "aa" }}>
              {formatDate(edu.startDate, locale)} - {formatDate(edu.endDate, locale)}
            </Text>
          </View>
          <Text style={{ fontSize: bodySize, color: colors.muted }}>
            {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
          </Text>
        </View>
      ))}
    </SectionBlock>
  );
}

function SkillsSection({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  if (!data.skills || data.skills.length === 0) return null;
  const { colors } = config;
  const bodySize = config.spacing.bodySize;
  const labels = getResumeLabels(locale);

  return (
    <SectionBlock title={labels.skills} config={config}>
      {config.skillsStyle === "badges" && (
        <View style={staticStyles.flexWrap}>
          {data.skills.map((skill, i) => (
            <Text key={i} style={{
              fontSize: bodySize - 1,
              backgroundColor: "#f0f0f0",
              padding: "2 6",
              marginRight: 4,
              marginBottom: 4,
              color: colors.text,
            }}>
              {skill}
            </Text>
          ))}
        </View>
      )}
      {config.skillsStyle === "list" && (
        <View style={staticStyles.flexCol}>
          {data.skills.map((skill, i) => (
            <Text key={i} style={{ fontSize: bodySize - 1, color: colors.text, marginBottom: 2 }}>{skill}</Text>
          ))}
        </View>
      )}
      {config.skillsStyle === "inline" && (
        <Text style={{ fontSize: bodySize - 1, color: colors.text, lineHeight: 1.5 }}>
          {data.skills.join("  •  ")}
        </Text>
      )}
      {config.skillsStyle === "tags" && (
        <View style={staticStyles.flexWrap}>
          {data.skills.map((skill, i) => (
            <Text key={i} style={{
              fontSize: bodySize - 1,
              backgroundColor: colors.primary + "15",
              color: colors.primary,
              padding: "2 6",
              marginRight: 4,
              marginBottom: 4,
              borderRadius: 2,
            }}>
              {skill}
            </Text>
          ))}
        </View>
      )}
    </SectionBlock>
  );
}

function CertificationsSection({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  if (!data.certifications || data.certifications.length === 0) return null;
  const { colors, fonts } = config;
  const bodySize = config.spacing.bodySize;
  const labels = getResumeLabels(locale);

  return (
    <SectionBlock title={labels.certifications} config={config}>
      {data.certifications.map((cert, i) => (
        <View key={i} style={{ marginBottom: 6 }}>
          <View style={staticStyles.flexRow}>
            <Text style={{ fontSize: bodySize, fontFamily: fonts.heading, color: colors.text }}>{cert.name}</Text>
            <Text style={{ fontSize: bodySize - 2, color: colors.muted + "aa" }}>{formatDate(cert.date || "")}</Text>
          </View>
          <Text style={{ fontSize: bodySize - 1, color: colors.muted }}>{cert.issuer}</Text>
        </View>
      ))}
    </SectionBlock>
  );
}

function LanguagesSection({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  if (!data.languages || data.languages.length === 0) return null;
  const { colors } = config;
  const bodySize = config.spacing.bodySize;
  const labels = getResumeLabels(locale);

  return (
    <SectionBlock title={labels.languages} config={config}>
      {data.languages.map((lang, i) => (
        <View key={i} style={[staticStyles.flexRow, { marginBottom: 3 }]}>
          <Text style={{ fontSize: bodySize, color: colors.text }}>{lang.name}</Text>
          <Text style={{ fontSize: bodySize - 1, color: colors.muted }}>{lang.level}</Text>
        </View>
      ))}
    </SectionBlock>
  );
}

function SidebarContent({ data, config, sidebarWidth, locale }: { data: ResumeData; config: TemplateConfig; sidebarWidth: string; locale: "en" | "km" }) {
  const { colors, fonts } = config;
  const spacing = config.spacing;
  const bodySize = spacing.bodySize;
  const labels = getResumeLabels(locale);

  return (
    <View style={{
      width: sidebarWidth, backgroundColor: colors.sidebar || colors.primary,
      padding: spacing.padding, paddingTop: spacing.padding + 8, minHeight: "100%",
    }}>
      {config.photoStyle !== "none" && (
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <PhotoView data={data} config={config} size={48} />
        </View>
      )}
      <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.sidebarText || "#ffffff", marginBottom: 2 }}>
        {data.personalInfo?.fullName || "Your Name"}
      </Text>
      {data.personalInfo?.title && (
        <Text style={{ fontSize: 11, color: (colors.sidebarText || "#ffffff") + "99", marginBottom: 16 }}>{data.personalInfo.title}</Text>
      )}
      <Text style={{ fontSize: 8, color: (colors.sidebarText || "#ffffff") + "88", textTransform: "uppercase", marginTop: 8, marginBottom: 4 }}>{labels.contact}</Text>
      {data.personalInfo?.email && <Text style={{ fontSize: 9, color: colors.sidebarText, marginBottom: 3 }}>{data.personalInfo.email}</Text>}
      {data.personalInfo?.phone && <Text style={{ fontSize: 9, color: colors.sidebarText, marginBottom: 3 }}>{data.personalInfo.phone}</Text>}
      {data.personalInfo?.address && <Text style={{ fontSize: 9, color: colors.sidebarText, marginBottom: 3 }}>{data.personalInfo.address}</Text>}

      {data.skills && data.skills.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: (colors.sidebarText || "#ffffff") + "99", textTransform: "uppercase", letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: (colors.sidebarText || "#ffffff") + "33", paddingBottom: 4, marginBottom: 8 }}>
            {labels.skills}
          </Text>
          {data.skills.map((skill, i) => (
            <Text key={i} style={{ fontSize: bodySize - 1, color: colors.sidebarText, marginBottom: 3 }}>- {skill}</Text>
          ))}
        </View>
      )}

      {data.languages && data.languages.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: (colors.sidebarText || "#ffffff") + "99", textTransform: "uppercase", letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: (colors.sidebarText || "#ffffff") + "33", paddingBottom: 4, marginBottom: 8 }}>
            {labels.languages}
          </Text>
          {data.languages.map((lang, i) => (
            <View key={i} style={[staticStyles.flexRow, { marginBottom: 3 }]}>
              <Text style={{ fontSize: bodySize - 1, color: colors.sidebarText }}>{lang.name}</Text>
              <Text style={{ fontSize: bodySize - 2, color: (colors.sidebarText || "#ffffff") + "88" }}>{lang.level}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function MainContent({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  return (
    <View style={{ flex: 1, padding: config.spacing.padding }}>
      <SummarySection data={data} config={config} locale={locale} />
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      {config.layout !== "sidebar-left" && config.layout !== "sidebar-right" && <SkillsSection data={data} config={config} locale={locale} />}
      {config.layout !== "sidebar-left" && config.layout !== "sidebar-right" && <LanguagesSection data={data} config={config} locale={locale} />}
    </View>
  );
}

function SingleColumnPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  return (
    <Page size="A4" style={[staticStyles.page, { padding: config.spacing.padding }]}>
      <HeaderSection data={data} config={config} />
      <SummarySection data={data} config={config} locale={locale} />
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <SkillsSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      <LanguagesSection data={data} config={config} locale={locale} />
    </Page>
  );
}

function SidebarPage({ data, config, sidebarRight, locale }: { data: ResumeData; config: TemplateConfig; sidebarRight?: boolean; locale: "en" | "km" }) {
  const sidebarWidth = "35%";
  return (
    <Page size="A4" style={staticStyles.pageRow}>
      {sidebarRight ? (
        <>
          <MainContent data={data} config={config} locale={locale} />
          <SidebarContent data={data} config={config} sidebarWidth={sidebarWidth} locale={locale} />
        </>
      ) : (
        <>
          <SidebarContent data={data} config={config} sidebarWidth={sidebarWidth} locale={locale} />
          <MainContent data={data} config={config} locale={locale} />
        </>
      )}
    </Page>
  );
}

function HeaderCardPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{
        backgroundColor: colors.primary, padding: 20, marginBottom: spacing.sectionGap,
        marginLeft: -spacing.padding, marginRight: -spacing.padding,
        paddingLeft: spacing.padding, paddingRight: spacing.padding,
      }}>
        {config.photoStyle !== "none" && (
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <PhotoView data={data} config={config} size={56} />
          </View>
        )}
        <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.headerText || "#ffffff", textAlign: "center", marginBottom: 4 }}>
          {data.personalInfo?.fullName || "Your Name"}
        </Text>
        {data.personalInfo?.title && (
          <Text style={{ fontSize: 13, color: (colors.headerText || "#ffffff") + "bb", textAlign: "center", marginBottom: 8 }}>{data.personalInfo.title}</Text>
        )}
        <View style={[staticStyles.flexRow, { justifyContent: "center", flexWrap: "wrap", gap: 8 }]}>
          {data.personalInfo?.email && <Text style={{ fontSize: 9, color: colors.headerText || "#ffffff" }}>{data.personalInfo.email}</Text>}
          {data.personalInfo?.phone && <Text style={{ fontSize: 9, color: colors.headerText || "#ffffff" }}>{data.personalInfo.phone}</Text>}
          {data.personalInfo?.address && <Text style={{ fontSize: 9, color: colors.headerText || "#ffffff" }}>{data.personalInfo.address}</Text>}
        </View>
      </View>
      <SummarySection data={data} config={config} locale={locale} />
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <SkillsSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      <LanguagesSection data={data} config={config} locale={locale} />
    </Page>
  );
}

function ExecutivePage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  const labels = getResumeLabels(locale);
  return (
    <Page size="A4" style={[staticStyles.page, { flexDirection: "row" }]}>
      <View style={{ width: "30%", backgroundColor: colors.primary, padding: spacing.padding, paddingTop: spacing.padding + 10, minHeight: "100%" }}>
        {config.photoStyle !== "none" && (
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <PhotoView data={data} config={config} size={52} />
          </View>
        )}
        <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.sidebarText || "#ffffff", marginBottom: 2, textAlign: "center" }}>
          {data.personalInfo?.fullName || "Your Name"}
        </Text>
        {data.personalInfo?.title && (
          <Text style={{ fontSize: 10, color: (colors.sidebarText || "#ffffff") + "99", textAlign: "center", marginBottom: 16 }}>{data.personalInfo.title}</Text>
        )}
        <View style={{ borderTopWidth: 1, borderTopColor: (colors.sidebarText || "#ffffff") + "33", paddingTop: 12, marginTop: 8 }}>
          {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.sidebarText, marginBottom: 4 }}>{data.personalInfo.email}</Text>}
          {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.sidebarText, marginBottom: 4 }}>{data.personalInfo.phone}</Text>}
          {data.personalInfo?.address && <Text style={{ fontSize: 8, color: colors.sidebarText, marginBottom: 4 }}>{data.personalInfo.address}</Text>}
        </View>
        {data.skills && data.skills.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.sidebarText || "#ffffff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{labels.skills}</Text>
            {data.skills.map((skill, i) => (
              <Text key={i} style={{ fontSize: 8, color: (colors.sidebarText || "#ffffff") + "cc", marginBottom: 3 }}>{skill}</Text>
            ))}
          </View>
        )}
        {data.languages && data.languages.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.sidebarText || "#ffffff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{labels.languages}</Text>
            {data.languages.map((lang, i) => (
              <View key={i} style={staticStyles.flexRow}>
                <Text style={{ fontSize: 8, color: colors.sidebarText }}>{lang.name}</Text>
                <Text style={{ fontSize: 7, color: (colors.sidebarText || "#ffffff") + "88" }}>{lang.level}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ flex: 1, padding: spacing.padding }}>
        <SummarySection data={data} config={config} locale={locale} />
        <ExperienceSection data={data} config={config} locale={locale} />
        <EducationSection data={data} config={config} locale={locale} />
        <CertificationsSection data={data} config={config} locale={locale} />
      </View>
    </Page>
  );
}

function ElegantPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{ borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 12, marginBottom: spacing.sectionGap }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 14 : 0, marginBottom: 4 }}>
          {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={52} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text }}>
              {data.personalInfo?.fullName || "Your Name"}
            </Text>
            {data.personalInfo?.title && (
              <Text style={{ fontSize: 12, color: colors.muted, fontStyle: "italic", marginTop: 2 }}>{data.personalInfo.title}</Text>
            )}
          </View>
        </View>
        <View style={[staticStyles.flexRow, { flexWrap: "wrap", gap: 6, fontSize: 9 }]}>
          {data.personalInfo?.email && <Text style={{ color: colors.muted }}>{data.personalInfo.email}</Text>}
          {data.personalInfo?.phone && <Text style={{ color: colors.muted }}>| {data.personalInfo.phone}</Text>}
          {data.personalInfo?.address && <Text style={{ color: colors.muted }}>| {data.personalInfo.address}</Text>}
        </View>
      </View>
      <SummarySection data={data} config={config} locale={locale} />
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <SkillsSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      <LanguagesSection data={data} config={config} locale={locale} />
    </Page>
  );
}

function PhotoHeaderPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{ flexDirection: "row", gap: 16, marginBottom: spacing.sectionGap, alignItems: "center" }}>
        {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={60} />}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text }}>{data.personalInfo?.fullName || "Your Name"}</Text>
          {data.personalInfo?.title && <Text style={{ fontSize: 12, color: colors.muted }}>{data.personalInfo.title}</Text>}
          <View style={[staticStyles.flexRow, { marginTop: 4, gap: 8, flexWrap: "wrap" }]}>
            {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.email}</Text>}
            {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.phone}</Text>}
          </View>
        </View>
      </View>
      <SummarySection data={data} config={config} locale={locale} />
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <SkillsSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      <LanguagesSection data={data} config={config} locale={locale} />
    </Page>
  );
}

function InfoGraphicPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  const labels = getResumeLabels(locale);
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{ marginBottom: spacing.sectionGap }}>
        <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text }}>{data.personalInfo?.fullName || "Your Name"}</Text>
        {data.personalInfo?.title && <Text style={{ fontSize: 11, color: colors.accent, marginBottom: 4 }}>{data.personalInfo.title}</Text>}
        <View style={[staticStyles.flexRow, { flexWrap: "wrap", gap: 6 }]}>
          {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.muted }}>  {data.personalInfo.email}</Text>}
          {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.muted }}>  {data.personalInfo.phone}</Text>}
        </View>
      </View>
      {data.personalInfo?.summary && <SummarySection data={data} config={config} locale={locale} />}
      {data.skills && data.skills.length > 0 && (
        <View style={{ marginBottom: spacing.sectionGap }}>
          <SectionTitle title={labels.skills} config={config} />
          {data.skills.map((s, i) => (
            <View key={i} style={{ marginBottom: 4, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ width: 80, fontSize: 8, color: colors.text }}>{s}</Text>
              <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                <View style={{ width: `${Math.min(100, (i + 1) * 25)}%`, height: 6, backgroundColor: colors.accent, borderRadius: 3 }} />
              </View>
            </View>
          ))}
        </View>
      )}
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      <LanguagesSection data={data} config={config} locale={locale} />
    </Page>
  );
}

function TwoColumnPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { flexDirection: "row" }]}>
      <View style={{ width: "48%", padding: spacing.padding, paddingRight: spacing.padding / 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 10 : 0, marginBottom: 6 }}>
          {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={42} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text }}>{data.personalInfo?.fullName || "Your Name"}</Text>
            {data.personalInfo?.title && <Text style={{ fontSize: 10, color: colors.muted }}>{data.personalInfo.title}</Text>}
          </View>
        </View>
        {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 2 }}>{data.personalInfo.email}</Text>}
        {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 2 }}>{data.personalInfo.phone}</Text>}
        {data.personalInfo?.address && <Text style={{ fontSize: 8, color: colors.muted, marginBottom: 12 }}>{data.personalInfo.address}</Text>}
        <SummarySection data={data} config={config} locale={locale} />
        <SkillsSection data={data} config={config} locale={locale} />
        <LanguagesSection data={data} config={config} locale={locale} />
      </View>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View style={{ width: "48%", padding: spacing.padding, paddingLeft: spacing.padding / 2 }}>
        <ExperienceSection data={data} config={config} locale={locale} />
        <EducationSection data={data} config={config} locale={locale} />
        <CertificationsSection data={data} config={config} locale={locale} />
      </View>
    </Page>
  );
}

function ColorBlockPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  const labels = getResumeLabels(locale);
  return (
    <Page size="A4" style={[staticStyles.page]}>
      <View style={{ backgroundColor: colors.primary, padding: spacing.padding, marginBottom: spacing.sectionGap }}>
        {config.photoStyle !== "none" && (
          <View style={{ marginBottom: 8 }}>
            <PhotoView data={data} config={config} size={52} />
          </View>
        )}
        <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.headerText || "#fff" }}>{data.personalInfo?.fullName || "Your Name"}</Text>
        {data.personalInfo?.title && <Text style={{ fontSize: 11, color: (colors.headerText || "#fff") + "bb" }}>{data.personalInfo.title}</Text>}
      </View>
      <View style={{ paddingHorizontal: spacing.padding }}>
        {data.personalInfo?.summary && (
          <View style={{ backgroundColor: colors.primary + "08", padding: 12, marginBottom: spacing.sectionGap, marginHorizontal: -spacing.padding, paddingHorizontal: spacing.padding }}>
            <SectionTitle title={labels.summary} config={config} />
            <Text style={{ fontSize: spacing.bodySize, color: colors.muted }}>{data.personalInfo.summary}</Text>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: spacing.padding }}>
        <ExperienceSection data={data} config={config} locale={locale} />
        <EducationSection data={data} config={config} locale={locale} />
        <SkillsSection data={data} config={config} locale={locale} />
        <CertificationsSection data={data} config={config} locale={locale} />
        <LanguagesSection data={data} config={config} locale={locale} />
      </View>
    </Page>
  );
}

function BorderedPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page]}>
      <View style={{ margin: 16, borderWidth: 2, borderColor: colors.primary + "44", padding: spacing.padding - 8 }}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: spacing.sectionGap }}>
          {config.photoStyle !== "none" && (
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <PhotoView data={data} config={config} size={50} />
            </View>
          )}
          <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text, textAlign: "center" }}>{data.personalInfo?.fullName || "Your Name"}</Text>
          {data.personalInfo?.title && <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center", fontStyle: "italic" }}>{data.personalInfo.title}</Text>}
          <View style={[staticStyles.flexRow, { justifyContent: "center", flexWrap: "wrap", gap: 6, marginTop: 6 }]}>
            {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.email}</Text>}
            {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.muted }}>| {data.personalInfo.phone}</Text>}
          </View>
        </View>
        <SummarySection data={data} config={config} locale={locale} />
        <ExperienceSection data={data} config={config} locale={locale} />
        <EducationSection data={data} config={config} locale={locale} />
        <SkillsSection data={data} config={config} locale={locale} />
        <CertificationsSection data={data} config={config} locale={locale} />
        <LanguagesSection data={data} config={config} locale={locale} />
      </View>
    </Page>
  );
}

function SplitHeaderPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  const info = data.personalInfo || {};
  return (
    <Page size="A4" style={[staticStyles.page]}>
      <View style={{ backgroundColor: colors.primary, padding: spacing.padding, paddingBottom: spacing.padding - 8, marginBottom: spacing.sectionGap }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 12 : 0 }}>
          {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={48} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.headerText || "#fff" }}>{info.fullName || "Your Name"}</Text>
            {info.title && <Text style={{ fontSize: 11, color: (colors.headerText || "#fff") + "bb" }}>{info.title}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {info.email && <Text style={{ fontSize: 8, color: (colors.headerText || "#fff") + "cc" }}>{info.email}</Text>}
            {info.phone && <Text style={{ fontSize: 8, color: (colors.headerText || "#fff") + "cc" }}>{info.phone}</Text>}
          </View>
        </View>
        <View style={{ height: 4, backgroundColor: colors.accent, marginTop: 12, width: "40%", borderRadius: 2 }} />
      </View>
      <View style={{ paddingHorizontal: spacing.padding }}>
        <SummarySection data={data} config={config} locale={locale} />
        <ExperienceSection data={data} config={config} locale={locale} />
        <EducationSection data={data} config={config} locale={locale} />
        <SkillsSection data={data} config={config} locale={locale} />
        <CertificationsSection data={data} config={config} locale={locale} />
        <LanguagesSection data={data} config={config} locale={locale} />
      </View>
    </Page>
  );
}

function MagazinePage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 14 : 0, marginBottom: 4 }}>
        {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={46} />}
        <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text, letterSpacing: 2, textTransform: "uppercase", flex: 1 }}>
          {data.personalInfo?.fullName || "Your Name"}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sectionGap, borderBottomWidth: 2, borderBottomColor: colors.accent, paddingBottom: 8 }}>
        {data.personalInfo?.title && <Text style={{ fontSize: 10, color: colors.accent, fontStyle: "italic" }}>{data.personalInfo.title}</Text>}
        <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo?.email} | {data.personalInfo?.phone}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ flex: 1 }}>
          <SummarySection data={data} config={config} locale={locale} />
          <ExperienceSection data={data} config={config} locale={locale} />
        </View>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <View style={{ flex: 1 }}>
          <EducationSection data={data} config={config} locale={locale} />
          <SkillsSection data={data} config={config} locale={locale} />
          <CertificationsSection data={data} config={config} locale={locale} />
          <LanguagesSection data={data} config={config} locale={locale} />
        </View>
      </View>
    </Page>
  );
}

function ModernSerifPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{ marginBottom: spacing.sectionGap }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 14 : 0 }}>
          {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={48} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text, letterSpacing: 1 }}>
              {data.personalInfo?.fullName || "Your Name"}
            </Text>
            {data.personalInfo?.title && <Text style={{ fontSize: 11, color: colors.accent, fontStyle: "italic", fontFamily: fonts.heading }}>{data.personalInfo.title}</Text>}
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.email}</Text>}
          {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.phone}</Text>}
          {data.personalInfo?.address && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.address}</Text>}
        </View>
      </View>
      <SummarySection data={data} config={config} locale={locale} />
      <ExperienceSection data={data} config={config} locale={locale} />
      <EducationSection data={data} config={config} locale={locale} />
      <SkillsSection data={data} config={config} locale={locale} />
      <CertificationsSection data={data} config={config} locale={locale} />
      <LanguagesSection data={data} config={config} locale={locale} />
    </Page>
  );
}

function CardStylePage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  const labels = getResumeLabels(locale);
  return (
    <Page size="A4" style={[staticStyles.page, { padding: spacing.padding }]}>
      <View style={{ marginBottom: spacing.sectionGap }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 12 : 0 }}>
          {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={46} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text }}>{data.personalInfo?.fullName || "Your Name"}</Text>
            {data.personalInfo?.title && <Text style={{ fontSize: 11, color: colors.muted }}>{data.personalInfo.title}</Text>}
          </View>
        </View>
        <View style={[staticStyles.flexRow, { flexWrap: "wrap", gap: 6, marginTop: 4 }]}>
          {data.personalInfo?.email && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.email}</Text>}
          {data.personalInfo?.phone && <Text style={{ fontSize: 8, color: colors.muted }}>{data.personalInfo.phone}</Text>}
        </View>
      </View>
      {data.personalInfo?.summary && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: spacing.sectionGap, borderWidth: 1, borderColor: colors.border }}>
          <SectionTitle title={labels.summary} config={config} />
          <Text style={{ fontSize: spacing.bodySize, color: colors.muted }}>{data.personalInfo.summary}</Text>
        </View>
      )}
      {data.experience && data.experience.length > 0 && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: spacing.sectionGap, borderWidth: 1, borderColor: colors.border }}>
          <ExperienceSection data={data} config={config} locale={locale} />
        </View>
      )}
      {data.education && data.education.length > 0 && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: spacing.sectionGap, borderWidth: 1, borderColor: colors.border }}>
          <EducationSection data={data} config={config} locale={locale} />
        </View>
      )}
      {data.skills && data.skills.length > 0 && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: spacing.sectionGap, borderWidth: 1, borderColor: colors.border }}>
          <SkillsSection data={data} config={config} locale={locale} />
        </View>
      )}
      {data.certifications && data.certifications.length > 0 && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: spacing.sectionGap, borderWidth: 1, borderColor: colors.border }}>
          <CertificationsSection data={data} config={config} locale={locale} />
        </View>
      )}
      {data.languages && data.languages.length > 0 && (
        <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: spacing.sectionGap, borderWidth: 1, borderColor: colors.border }}>
          <LanguagesSection data={data} config={config} locale={locale} />
        </View>
      )}
    </Page>
  );
}

function MinimalSidebarPage({ data, config, locale }: { data: ResumeData; config: TemplateConfig; locale: "en" | "km" }) {
  const { colors, spacing, fonts } = config;
  return (
    <Page size="A4" style={[staticStyles.page, { flexDirection: "row" }]}>
      <View style={{ width: 6, backgroundColor: colors.accent, minHeight: "100%" }} />
      <View style={{ flex: 1, padding: spacing.padding }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: config.photoStyle !== "none" ? 12 : 0, marginBottom: 6 }}>
          {config.photoStyle !== "none" && <PhotoView data={data} config={config} size={44} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: spacing.nameSize, fontFamily: fonts.heading, fontWeight: "bold", color: colors.text }}>
              {data.personalInfo?.fullName || "Your Name"}
            </Text>
            {data.personalInfo?.title && <Text style={{ fontSize: 11, color: colors.muted }}>{data.personalInfo.title}</Text>}
          </View>
        </View>
        <SummarySection data={data} config={config} locale={locale} />
        <ExperienceSection data={data} config={config} locale={locale} />
        <EducationSection data={data} config={config} locale={locale} />
        <SkillsSection data={data} config={config} locale={locale} />
        <CertificationsSection data={data} config={config} locale={locale} />
        <LanguagesSection data={data} config={config} locale={locale} />
      </View>
    </Page>
  );
}

export function ResumeRenderer({ data, config, locale = "en" }: { data: ResumeData; config: TemplateConfig; locale?: "en" | "km" }) {
  switch (config.layout) {
    case "sidebar-left":
      return (
        <Document>
          <SidebarPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "sidebar-right":
      return (
        <Document>
          <SidebarPage data={data} config={config} sidebarRight locale={locale} />
        </Document>
      );
    case "header-card":
      return (
        <Document>
          <HeaderCardPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "executive":
      return (
        <Document>
          <ExecutivePage data={data} config={config} locale={locale} />
        </Document>
      );
    case "elegant":
      return (
        <Document>
          <ElegantPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "photo-header":
      return (
        <Document>
          <PhotoHeaderPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "infographic":
      return (
        <Document>
          <InfoGraphicPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "two-column":
      return (
        <Document>
          <TwoColumnPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "color-block":
      return (
        <Document>
          <ColorBlockPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "bordered":
      return (
        <Document>
          <BorderedPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "split-header":
      return (
        <Document>
          <SplitHeaderPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "magazine":
      return (
        <Document>
          <MagazinePage data={data} config={config} locale={locale} />
        </Document>
      );
    case "modern-serif":
      return (
        <Document>
          <ModernSerifPage data={data} config={config} locale={locale} />
        </Document>
      );
    case "card-style":
      return (
        <Document>
          <CardStylePage data={data} config={config} locale={locale} />
        </Document>
      );
    case "minimal-sidebar":
      return (
        <Document>
          <MinimalSidebarPage data={data} config={config} locale={locale} />
        </Document>
      );
    default:
      return (
        <Document>
          <SingleColumnPage data={data} config={config} locale={locale} />
        </Document>
      );
  }
}
