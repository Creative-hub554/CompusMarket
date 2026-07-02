"use client";

import { useState } from "react";

const emptyResume = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    title: "",
    summary: "",
  },
  education: [] as {
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }[],
  experience: [] as {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }[],
  skills: [] as string[],
  certifications: [] as {
    id: string;
    name: string;
    issuer: string;
    date: string;
  }[],
  languages: [] as { id: string; name: string; level: string }[],
};

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState({ ...emptyResume });
  const [newSkill, setNewSkill] = useState("");
  const [activeSection, setActiveSection] = useState("personal");

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
        { id: crypto.randomUUID(), name: "", level: "Intermediate" },
      ],
    }));
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

  const navItems = [
    { id: "personal", label: "Personal Info" },
    { id: "education", label: "Education" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "certifications", label: "Certifications" },
    { id: "languages", label: "Languages" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Resume Builder</h1>

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
          </nav>
        </aside>

        <div className="flex-1 max-w-2xl space-y-6">
          {activeSection === "personal" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Personal Information</h2>
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
                <h2 className="text-xl font-semibold">Education</h2>
                <button
                  onClick={addEducation}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                >
                  Add
                </button>
              </div>
              {resume.education.map((edu, i) => (
                <div key={edu.id} className="rounded border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium">Institution</label>
                      <input
                        value={edu.institution}
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[i] = { ...edu, institution: e.target.value };
                          setResume((prev) => ({ ...prev, education: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Degree</label>
                      <input
                        value={edu.degree}
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[i] = { ...edu, degree: e.target.value };
                          setResume((prev) => ({ ...prev, education: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Field</label>
                      <input
                        value={edu.field}
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[i] = { ...edu, field: e.target.value };
                          setResume((prev) => ({ ...prev, education: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Start</label>
                      <input
                        type="date"
                        value={edu.startDate}
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[i] = { ...edu, startDate: e.target.value };
                          setResume((prev) => ({ ...prev, education: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">End</label>
                      <input
                        type="date"
                        value={edu.endDate}
                        onChange={(e) => {
                          const updated = [...resume.education];
                          updated[i] = { ...edu, endDate: e.target.value };
                          setResume((prev) => ({ ...prev, education: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "experience" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Work Experience</h2>
                <button
                  onClick={addExperience}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                >
                  Add
                </button>
              </div>
              {resume.experience.map((exp, i) => (
                <div key={exp.id} className="rounded border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium">Company</label>
                      <input
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...resume.experience];
                          updated[i] = { ...exp, company: e.target.value };
                          setResume((prev) => ({ ...prev, experience: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Position</label>
                      <input
                        value={exp.position}
                        onChange={(e) => {
                          const updated = [...resume.experience];
                          updated[i] = { ...exp, position: e.target.value };
                          setResume((prev) => ({ ...prev, experience: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium">Start</label>
                        <input
                          type="date"
                          value={exp.startDate}
                          onChange={(e) => {
                            const updated = [...resume.experience];
                            updated[i] = { ...exp, startDate: e.target.value };
                            setResume((prev) => ({ ...prev, experience: updated }));
                          }}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium">End</label>
                        <input
                          type="date"
                          value={exp.endDate}
                          onChange={(e) => {
                            const updated = [...resume.experience];
                            updated[i] = { ...exp, endDate: e.target.value };
                            setResume((prev) => ({ ...prev, experience: updated }));
                          }}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium">Description</label>
                      <textarea
                        value={exp.description}
                        onChange={(e) => {
                          const updated = [...resume.experience];
                          updated[i] = { ...exp, description: e.target.value };
                          setResume((prev) => ({ ...prev, experience: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "skills" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Skills</h2>
              <div className="flex gap-2">
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 rounded border px-3 py-2 text-sm"
                />
                <button
                  onClick={addSkill}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {resume.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm"
                  >
                    {skill}
                    <button
                      onClick={() =>
                        setResume((prev) => ({
                          ...prev,
                          skills: prev.skills.filter((_, j) => j !== i),
                        }))
                      }
                      className="text-gray-400 hover:text-red-500"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeSection === "certifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Certifications</h2>
                <button
                  onClick={addCertification}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                >
                  Add
                </button>
              </div>
              {resume.certifications.map((cert, i) => (
                <div key={cert.id} className="rounded border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium">Name</label>
                      <input
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...resume.certifications];
                          updated[i] = { ...cert, name: e.target.value };
                          setResume((prev) => ({ ...prev, certifications: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Issuer</label>
                      <input
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...resume.certifications];
                          updated[i] = { ...cert, issuer: e.target.value };
                          setResume((prev) => ({ ...prev, certifications: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Date</label>
                      <input
                        type="date"
                        value={cert.date}
                        onChange={(e) => {
                          const updated = [...resume.certifications];
                          updated[i] = { ...cert, date: e.target.value };
                          setResume((prev) => ({ ...prev, certifications: updated }));
                        }}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "languages" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Languages</h2>
                <button
                  onClick={addLanguage}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                >
                  Add
                </button>
              </div>
              {resume.languages.map((lang, i) => (
                <div key={lang.id} className="flex gap-3 items-end rounded border p-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium">Language</label>
                    <input
                      value={lang.name}
                      onChange={(e) => {
                        const updated = [...resume.languages];
                        updated[i] = { ...lang, name: e.target.value };
                        setResume((prev) => ({ ...prev, languages: updated }));
                      }}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-xs font-medium">Level</label>
                    <select
                      value={lang.level}
                      onChange={(e) => {
                        const updated = [...resume.languages];
                        updated[i] = { ...lang, level: e.target.value };
                        setResume((prev) => ({ ...prev, languages: updated }));
                      }}
                      className="w-full rounded border px-3 py-2 text-sm"
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Native</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
