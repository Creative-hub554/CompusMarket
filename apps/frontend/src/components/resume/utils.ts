import { ResumeData } from "./types";

export type ResumeLabels = {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  languages: string;
  contact: string;
  present: string;
};

export function getResumeLabels(locale: "en" | "km"): ResumeLabels {
  if (locale === "km") {
    return {
      summary: "សេចក្ដីសង្ខេប",
      experience: "បទពិសោធន៍ការងារ",
      education: "ការសិក្សា",
      skills: "ជំនាញ",
      certifications: "វិញ្ញាបនបត្រ",
      languages: "ភាសា",
      contact: "ទំនាក់ទំនង",
      present: "បច្ចុប្បន្ន",
    };
  }
  return {
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
    languages: "Languages",
    contact: "Contact",
    present: "Present",
  };
}

export function formatDate(date: string | undefined | null, locale?: "en" | "km") {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString(locale === "km" ? "km-KH" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

export const emptyResume: ResumeData = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    title: "",
    summary: "",
  },
  education: [],
  experience: [],
  skills: [],
  certifications: [],
  languages: [],
};

export const sampleResume: ResumeData = {
  personalInfo: {
    fullName: "Sok Vannak",
    email: "sok.vannak@email.com",
    phone: "+855 12 345 678",
    address: "Phnom Penh, Cambodia",
    title: "Senior Software Engineer",
    summary: "Experienced software engineer with 8+ years building scalable web applications. Proficient in React, Node.js, and cloud technologies. Passionate about mentoring junior developers and delivering high-quality code.",
  },
  education: [
    { id: "edu1", institution: "Royal University of Phnom Penh", degree: "Bachelor of Science", field: "Computer Science", startDate: "2014-09-01", endDate: "2018-06-30" },
  ],
  experience: [
    { id: "exp1", company: "Tech Solutions Co., Ltd", position: "Senior Software Engineer", startDate: "2021-03-01", endDate: "", description: "Led a team of 5 developers building microservices architecture. Improved deployment pipeline reducing release time by 60%." },
    { id: "exp2", company: "Digital Innovations Inc.", position: "Software Engineer", startDate: "2018-07-01", endDate: "2021-02-28", description: "Developed RESTful APIs and React frontends for enterprise clients. Implemented CI/CD pipelines using Docker and Jenkins." },
  ],
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Docker", "PostgreSQL", "AWS", "Git", "Agile"],
  certifications: [
    { id: "cert1", name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", date: "2022-05-15" },
  ],
  languages: [
    { id: "lang1", name: "Khmer", level: "Native" },
    { id: "lang2", name: "English", level: "Advanced" },
  ],
};
