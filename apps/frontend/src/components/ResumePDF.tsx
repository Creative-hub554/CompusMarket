import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  header: { marginBottom: 20 },
  name: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  title: { fontSize: 14, color: "#555", marginBottom: 8 },
  contact: { fontSize: 9, color: "#777", flexDirection: "row", gap: 8 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: "uppercase" as const,
  },
  row: { marginBottom: 8 },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  institution: { fontSize: 11, fontWeight: "bold" },
  degree: { fontSize: 10, color: "#444" },
  date: { fontSize: 9, color: "#888" },
  description: { fontSize: 9, color: "#555", marginTop: 2, lineHeight: 1.4 },
  skillBadge: {
    fontSize: 9,
    backgroundColor: "#f0f0f0",
    padding: "2 6",
    marginRight: 4,
    marginBottom: 4,
  },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap" },
});

type ResumeData = {
  personalInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    title?: string;
    summary?: string;
  };
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  experience?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills?: string[];
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
  }>;
  languages?: Array<{
    name?: string;
    level?: string;
  }>;
};

type Props = { data: ResumeData };

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function formatDate(date: string | undefined | null) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function ResumePDF({ data }: Props) {
  const info = data.personalInfo || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{info.fullName || "Your Name"}</Text>
          {info.title && <Text style={styles.title}>{info.title}</Text>}
          <View style={styles.contact}>
            {info.email && <Text>{info.email}</Text>}
            {info.phone && <Text>{info.phone}</Text>}
            {info.address && <Text>{info.address}</Text>}
          </View>
        </View>

        {info.summary && (
          <ResumeSection title="Summary">
            <Text style={styles.description}>{info.summary}</Text>
          </ResumeSection>
        )}

        {data.experience && data.experience.length > 0 && (
          <ResumeSection title="Experience">
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.institution}>{exp.position}</Text>
                  <Text style={styles.date}>
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate) || "Present"}
                  </Text>
                </View>
                <Text style={styles.degree}>{exp.company}</Text>
                {exp.description && (
                  <Text style={styles.description}>{exp.description}</Text>
                )}
              </View>
            ))}
          </ResumeSection>
        )}

        {data.education && data.education.length > 0 && (
          <ResumeSection title="Education">
            {data.education.map((edu, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.institution}>{edu.institution}</Text>
                  <Text style={styles.date}>
                    {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                  </Text>
                </View>
                <Text style={styles.degree}>
                  {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
                </Text>
              </View>
            ))}
          </ResumeSection>
        )}

        {data.skills && data.skills.length > 0 && (
          <ResumeSection title="Skills">
            <View style={styles.skillsContainer}>
              {data.skills.map((skill, i) => (
                <Text key={i} style={styles.skillBadge}>
                  {skill}
                </Text>
              ))}
            </View>
          </ResumeSection>
        )}

        {data.certifications && data.certifications.length > 0 && (
          <ResumeSection title="Certifications">
            {data.certifications.map((cert, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.institution}>{cert.name}</Text>
                  <Text style={styles.date}>{formatDate(cert.date || "")}</Text>
                </View>
                <Text style={styles.degree}>{cert.issuer}</Text>
              </View>
            ))}
          </ResumeSection>
        )}

        {data.languages && data.languages.length > 0 && (
          <ResumeSection title="Languages">
            {data.languages.map((lang, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.institution}>
                  {lang.name} - {lang.level}
                </Text>
              </View>
            ))}
          </ResumeSection>
        )}
      </Page>
    </Document>
  );
}
