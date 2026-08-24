import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Free tools for the Khmer community: resume builder, documents, diagrams, flashcards, quizzes and more.",
  alternates: { canonical: "/community" },
};

const tools = [
  {
    href: "/community/resume",
    title: "Resume Builder",
    desc: "Create professional resumes with multiple templates, AI suggestions, and PDF export.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    ),
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/community/careers",
    title: "Career Resources",
    desc: "Interview tips, career guides, resume examples, and job search advice.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    ),
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    href: "/community/documents",
    title: "Document Editor",
    desc: "Create and edit rich text documents with a full-featured editor.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    ),
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  {
    href: "/community/diagrams",
    title: "Diagram Creator",
    desc: "Build flowcharts, mind maps, sequence diagrams, and more with Mermaid.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
    ),
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    href: "/community/flashcards",
    title: "Flashcards",
    desc: "Study with digital flashcards and spaced repetition (SM-2 algorithm).",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    ),
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    href: "/community/quizzes",
    title: "Quizzes",
    desc: "Create and take quizzes to test your knowledge.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    ),
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    href: "/community/notes",
    title: "Study Notes",
    desc: "Write and organize your study notes with Markdown support.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
    ),
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    href: "/community/image-processor",
    title: "Image Processor",
    desc: "Remove background, add a professional suit overlay, and set any background for your portrait photos.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    ),
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    href: "/community/design",
    title: "Design Assets",
    desc: "1,000+ free Cambodia-themed PNGs, color palettes, and design resources.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
    ),
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
];

export default function CommunityPage() {
  return (
    <div className="page-header">
      <h1 className="page-title">Community Resources</h1>
      <p className="page-subtitle">
        Free tools and resources for Cambodian job seekers, students, and professionals.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8 stagger-children">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="card p-6 group"
          >
            <div className={`w-12 h-12 ${tool.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 ${tool.color}`}>
              {tool.icon}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1.5 group-hover:text-indigo-600 transition-colors">
              {tool.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
