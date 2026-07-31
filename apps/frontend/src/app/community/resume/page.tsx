"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ResumeData } from "@/components/resume/types";
import { sampleResume, emptyResume } from "@/components/resume/utils";
import { getAllTemplates } from "@/components/resume/registry";
import "@/components/resume/templates";
import { AiResumeAssistant } from "@/components/ai/AiResumeAssistant";
import { useTranslation, TranslationProvider } from "@/lib/useTranslation";
import TemplateGallery from "@/components/resume/TemplateGallery";
import DraggableList, { DragHandle } from "@/components/resume/DraggableList";

const ResumePDF = dynamic(() => import("@/components/ResumePDF"), {
  ssr: false,
});

type SavedResume = { id: string; title: string; data: ResumeData; template?: string; updatedAt: string };

function ResumeBuilderContent() {
  const { t, locale, setLocale } = useTranslation();
  const [resume, setResume] = useState<ResumeData>({ ...sampleResume });
  const [newSkill, setNewSkill] = useState("");
  const [activeSection, setActiveSection] = useState("personal");
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState("My Resume");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("single-column-blue");
  const [galleryOpen, setGalleryOpen] = useState(true);
  const [exportLocale, setExportLocale] = useState<"en" | "km">("en");

  const templates = getAllTemplates();

  const handleExportPdf = useCallback(async () => {
    setPdfExporting(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: ResumePDFComponent } = await import("@/components/ResumePDF");
      const blob = await pdf(<ResumePDFComponent data={resume} template={selectedTemplate} locale={exportLocale} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resumeTitle.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF");
    } finally {
      setPdfExporting(false);
    }
  }, [resume, resumeTitle, selectedTemplate, exportLocale]);

  useEffect(() => {
    fetch("/api/resumes")
      .then((res) => res.json())
      .then((data) => {
        setSavedResumes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function addEducation() {
    setResume((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: crypto.randomUUID(), institution: "", degree: "", field: "", startDate: "", endDate: "" },
      ],
    }));
  }

  function addExperience() {
    setResume((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { id: crypto.randomUUID(), company: "", position: "", startDate: "", endDate: "", description: "" },
      ],
    }));
  }

  function addCertification() {
    setResume((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { id: crypto.randomUUID(), name: "", issuer: "", date: "" },
      ],
    }));
  }

  function addLanguage() {
    setResume((prev) => ({
      ...prev,
      languages: [
        ...prev.languages,
        { id: crypto.randomUUID(), name: "", level: t.resume.intermediate },
      ],
    }));
  }

  function reorderEducation(items: typeof resume.education) {
    setResume((prev) => ({ ...prev, education: items }));
  }

  function reorderExperience(items: typeof resume.experience) {
    setResume((prev) => ({ ...prev, experience: items }));
  }

  function reorderCertifications(items: typeof resume.certifications) {
    setResume((prev) => ({ ...prev, certifications: items }));
  }

  function reorderLanguages(items: typeof resume.languages) {
    setResume((prev) => ({ ...prev, languages: items }));
  }

  function reorderSkills(items: string[]) {
    setResume((prev) => ({ ...prev, skills: items }));
  }

  function removeItem<T>(arr: T[], index: number, setter: (items: T[]) => void) {
    const updated = [...arr];
    updated.splice(index, 1);
    setter(updated);
  }

  function addSkill() {
    if (newSkill.trim()) {
      setResume((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  }

  async function saveResume() {
    setSaving(true);
    try {
      if (currentResumeId) {
        await fetch(`/api/resumes/${currentResumeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: resumeTitle, data: resume, template: selectedTemplate }),
        });
      } else {
        const res = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: resumeTitle, data: resume, template: selectedTemplate }),
        });
        const created = await res.json();
        setCurrentResumeId(created.id);
      }
      const res = await fetch("/api/resumes");
      setSavedResumes(await res.json());
    } finally {
      setSaving(false);
    }
  }

  async function loadResume(r: SavedResume) {
    setCurrentResumeId(r.id);
    setResumeTitle(r.title);
    setResume(r.data);
    if (r.template && templates.some((t) => t.id === r.template)) {
      setSelectedTemplate(r.template);
    }
  }

  async function deleteResume(id: string) {
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (currentResumeId === id) {
      setCurrentResumeId(null);
      setResumeTitle("My Resume");
      setResume({ ...emptyResume });
    }
    setSavedResumes((prev) => prev.filter((r) => r.id !== id));
  }

  async function newResume() {
    setCurrentResumeId(null);
    setResumeTitle("My Resume");
    setResume({ ...emptyResume });
  }

  const navItems = [
    { id: "personal", label: t.resume.personalInfo },
    { id: "education", label: t.resume.education },
    { id: "experience", label: t.resume.experience },
    { id: "skills", label: t.resume.skills },
    { id: "certifications", label: t.resume.certifications },
    { id: "languages", label: t.resume.languages },
  ];

  const levelOptions = [t.resume.beginner, t.resume.intermediate, t.resume.advanced, t.resume.native];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t.resume.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.resume.subtitle}</p>
          <button
            onClick={() => setGalleryOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <span style={{
              display: "inline-block", width: 10, height: 10, borderRadius: "50%",
              backgroundColor: (templates.find((t) => t.id === selectedTemplate)?.config.colors.primary || "#1a237e"),
            }} />
            <span className="font-medium">{locale === "km" ? templates.find((t) => t.id === selectedTemplate)?.nameKm : templates.find((t) => t.id === selectedTemplate)?.name}</span>
            <span className="text-xs text-gray-400">{locale === "km" ? "ប្តូរ" : "Change"}</span>
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setLocale(locale === "en" ? "km" : "en")}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            {locale === "en" ? t.resume.languageKm : t.resume.languageEn}
          </button>
          <input
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm w-48"
          />
          <button
            onClick={saveResume}
            disabled={saving}
            className="rounded bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? t.resume.saving : t.resume.save}
          </button>
          <button
            onClick={() => setExportLocale(exportLocale === "en" ? "km" : "en")}
            className={`rounded px-2 py-1.5 text-xs font-medium border ${exportLocale === "km" ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-600"}`}
          >
            {exportLocale === "en" ? "ខ្មែរ" : "EN"}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 inline-block disabled:opacity-50"
          >
            {pdfExporting ? t.resume.generating : t.resume.exportPdf}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <nav className="space-y-1 sticky top-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`block w-full rounded px-3 py-2 text-left text-sm font-medium transition ${
                  activeSection === item.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
            <hr className="my-3" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 px-3 uppercase">
                {t.resume.savedResumes}
              </p>
              {loading ? (
                <p className="px-3 text-xs text-gray-400">{t.resume.loading}</p>
              ) : savedResumes.length === 0 ? (
                <p className="px-3 text-xs text-gray-400">{t.resume.noSavedResumes}</p>
              ) : (
                savedResumes.map((r) => (
                  <div key={r.id} className="flex items-center gap-1 px-2">
                    <button
                      onClick={() => loadResume(r)}
                      className={`flex-1 rounded px-2 py-1 text-left text-xs transition ${
                        currentResumeId === r.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {r.title}
                    </button>
                    <button
                      onClick={() => deleteResume(r.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      x
                    </button>
                  </div>
                ))
              )}
              <button
                onClick={newResume}
                className="w-full rounded px-2 py-1 text-left text-xs text-blue-600 hover:bg-blue-50"
              >
                {t.resume.newResume}
              </button>
            </div>
          </nav>
        </aside>

        <div className="flex-1 max-w-2xl space-y-6">
          {activeSection === "personal" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t.resume.personalInfo}</h2>
              {Object.entries(resume.personalInfo).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1 capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                  {key === "summary" ? (
                    <textarea
                      value={value}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, [key]: e.target.value },
                        }))
                      }
                      className="w-full rounded border px-3 py-2 text-sm"
                      rows={4}
                    />
                  ) : (
                    <input
                      type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                      value={value}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, [key]: e.target.value },
                        }))
                      }
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {activeSection === "education" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t.resume.education}</h2>
                <button onClick={addEducation} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                  {t.resume.add}
                </button>
              </div>
              <DraggableList
                items={resume.education}
                onReorder={reorderEducation}
                keyExtractor={(e) => e.id}
                renderItem={(edu, i) => (
                  <div data-draggable-item className="rounded border p-4 space-y-3 mb-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <DragHandle index={i} onDragStart={() => {}} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {edu.institution || t.resume.institution}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(resume.education, i, reorderEducation)}
                        className="text-gray-400 hover:text-red-500 text-sm px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium">{t.resume.institution}</label>
                        <input value={edu.institution} onChange={(e) => { const u = [...resume.education]; u[i] = { ...edu, institution: e.target.value }; setResume((p) => ({ ...p, education: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.degree}</label>
                        <input value={edu.degree} onChange={(e) => { const u = [...resume.education]; u[i] = { ...edu, degree: e.target.value }; setResume((p) => ({ ...p, education: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.field}</label>
                        <input value={edu.field} onChange={(e) => { const u = [...resume.education]; u[i] = { ...edu, field: e.target.value }; setResume((p) => ({ ...p, education: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.start}</label>
                        <input type="date" value={edu.startDate} onChange={(e) => { const u = [...resume.education]; u[i] = { ...edu, startDate: e.target.value }; setResume((p) => ({ ...p, education: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.end}</label>
                        <input type="date" value={edu.endDate} onChange={(e) => { const u = [...resume.education]; u[i] = { ...edu, endDate: e.target.value }; setResume((p) => ({ ...p, education: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeSection === "experience" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t.resume.experience}</h2>
                <button onClick={addExperience} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                  {t.resume.add}
                </button>
              </div>
              <DraggableList
                items={resume.experience}
                onReorder={reorderExperience}
                keyExtractor={(e) => e.id}
                renderItem={(exp, i) => (
                  <div data-draggable-item className="rounded border p-4 space-y-3 mb-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <DragHandle index={i} onDragStart={() => {}} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {exp.company || t.resume.company}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(resume.experience, i, reorderExperience)}
                        className="text-gray-400 hover:text-red-500 text-sm px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium">{t.resume.company}</label>
                        <input value={exp.company} onChange={(e) => { const u = [...resume.experience]; u[i] = { ...exp, company: e.target.value }; setResume((p) => ({ ...p, experience: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.position}</label>
                        <input value={exp.position} onChange={(e) => { const u = [...resume.experience]; u[i] = { ...exp, position: e.target.value }; setResume((p) => ({ ...p, experience: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium">{t.resume.start}</label>
                          <input type="date" value={exp.startDate} onChange={(e) => { const u = [...resume.experience]; u[i] = { ...exp, startDate: e.target.value }; setResume((p) => ({ ...p, experience: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium">{t.resume.end}</label>
                          <input type="date" value={exp.endDate} onChange={(e) => { const u = [...resume.experience]; u[i] = { ...exp, endDate: e.target.value }; setResume((p) => ({ ...p, experience: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium">{t.resume.description}</label>
                        <textarea value={exp.description} onChange={(e) => { const u = [...resume.experience]; u[i] = { ...exp, description: e.target.value }; setResume((p) => ({ ...p, experience: u })); }} className="w-full rounded border px-3 py-2 text-sm" rows={3} />
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeSection === "skills" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t.resume.skills}</h2>
              <div className="flex gap-2">
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder={t.resume.skillPlaceholder}
                  className="flex-1 rounded border px-3 py-2 text-sm"
                />
                <button onClick={addSkill} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
                  {t.resume.add}
                </button>
              </div>
              <DraggableList
                items={resume.skills.map((s, idx) => ({ id: `skill-${idx}`, name: s }))}
                onReorder={(items) => reorderSkills(items.map((i) => i.name))}
                keyExtractor={(e) => e.id}
                renderItem={(item, i) => (
                  <div data-draggable-item className="flex items-center gap-2 mb-2">
                    <DragHandle index={i} onDragStart={() => {}} />
                    <span className="flex-1 rounded bg-gray-100 px-3 py-1.5 text-sm flex items-center justify-between">
                      <span>{item.name}</span>
                      <button
                        onClick={() => {
                          const updated = resume.skills.filter((_, j) => j !== i);
                          setResume((prev) => ({ ...prev, skills: updated }));
                        }}
                        className="text-gray-400 hover:text-red-500 ml-2"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )}
              />
            </div>
          )}

          {activeSection === "certifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t.resume.certifications}</h2>
                <button onClick={addCertification} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                  {t.resume.add}
                </button>
              </div>
              <DraggableList
                items={resume.certifications}
                onReorder={reorderCertifications}
                keyExtractor={(e) => e.id}
                renderItem={(cert, i) => (
                  <div data-draggable-item className="rounded border p-4 space-y-3 mb-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <DragHandle index={i} onDragStart={() => {}} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {cert.name || t.resume.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(resume.certifications, i, reorderCertifications)}
                        className="text-gray-400 hover:text-red-500 text-sm px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium">{t.resume.name}</label>
                        <input value={cert.name} onChange={(e) => { const u = [...resume.certifications]; u[i] = { ...cert, name: e.target.value }; setResume((p) => ({ ...p, certifications: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.issuer}</label>
                        <input value={cert.issuer} onChange={(e) => { const u = [...resume.certifications]; u[i] = { ...cert, issuer: e.target.value }; setResume((p) => ({ ...p, certifications: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium">{t.resume.date}</label>
                        <input type="date" value={cert.date} onChange={(e) => { const u = [...resume.certifications]; u[i] = { ...cert, date: e.target.value }; setResume((p) => ({ ...p, certifications: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeSection === "languages" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t.resume.languages}</h2>
                <button onClick={addLanguage} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                  {t.resume.add}
                </button>
              </div>
              <DraggableList
                items={resume.languages}
                onReorder={reorderLanguages}
                keyExtractor={(e) => e.id}
                renderItem={(lang, i) => (
                  <div data-draggable-item className="rounded border p-4 mb-3 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <DragHandle index={i} onDragStart={() => {}} />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {lang.name || t.resume.language}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(resume.languages, i, reorderLanguages)}
                        className="text-gray-400 hover:text-red-500 text-sm px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-xs font-medium">{t.resume.language}</label>
                        <input value={lang.name} onChange={(e) => { const u = [...resume.languages]; u[i] = { ...lang, name: e.target.value }; setResume((p) => ({ ...p, languages: u })); }} className="w-full rounded border px-3 py-2 text-sm" />
                      </div>
                      <div className="w-40">
                        <label className="text-xs font-medium">{t.resume.level}</label>
                        <select value={lang.level} onChange={(e) => { const u = [...resume.languages]; u[i] = { ...lang, level: e.target.value }; setResume((p) => ({ ...p, languages: u })); }} className="w-full rounded border px-3 py-2 text-sm">
                          {levelOptions.map((opt) => (
                            <option key={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </div>

        <aside className="w-80 shrink-0">
          <AiResumeAssistant
            currentSummary={resume.personalInfo.summary}
            onImprove={(text) => {
              if (activeSection === "personal") {
                setResume((prev) => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, summary: text },
                }));
              } else if (activeSection === "experience" && resume.experience.length > 0) {
                const updated = [...resume.experience];
                const idx = updated.length - 1;
                updated[idx] = { ...updated[idx], description: text };
                setResume((prev) => ({ ...prev, experience: updated }));
              }
            }}
          />
        </aside>
      </div>
      <TemplateGallery
        open={galleryOpen}
        selectedId={selectedTemplate}
        onSelect={(id) => setSelectedTemplate(id)}
        onClose={() => setGalleryOpen(false)}
        locale={locale}
      />
    </div>
  );
}

export default function ResumeBuilderPage() {
  return (
    <TranslationProvider>
      <ResumeBuilderContent />
    </TranslationProvider>
  );
}
