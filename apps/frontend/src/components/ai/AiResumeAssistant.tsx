"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

type Props = {
  onImprove: (text: string) => void;
  currentSummary?: string;
};

export function AiResumeAssistant({ onImprove, currentSummary = "" }: Props) {
  const { t } = useTranslation();
  const authedFetch = useAuthedFetch();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"summary" | "experience" | "cover-letter">("summary");
  const [summary, setSummary] = useState(currentSummary);
  const [targetRole, setTargetRole] = useState("");
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [fullName, setFullName] = useState("");
  const [skills, setSkills] = useState("");

  async function handleSubmit() {
    setLoading(true);
    try {
      let action = "";
      let data: any = {};

      if (mode === "summary") {
        action = "resume/improve-summary";
        data = { summary, targetRole: targetRole || undefined };
      } else if (mode === "experience") {
        action = "resume/improve-experience";
        data = { description, position, company };
      } else {
        action = "resume/cover-letter";
        data = {
          fullName,
          targetRole,
          company,
          skills: skills.split(",").map((s) => s.trim()),
          experience: description,
        };
      }

      const res = await authedFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const json = await res.json();
      if (json.result) onImprove(json.result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gold-200 bg-gold-50 p-4">
      <h3 className="text-sm font-semibold text-gold-800 mb-3">{t.ai.title}</h3>

      <div className="flex gap-2 mb-3">
        {(["summary", "experience", "cover-letter"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 text-xs rounded-full transition ${
              mode === m ? "bg-gold-600 text-white" : "bg-white text-gold-600 border border-gold-200"
            }`}
          >
            {m === "summary" ? t.ai.summary : m === "experience" ? t.ai.experience : t.ai.coverLetter}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {mode === "summary" && (
          <>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t.ai.summaryPlaceholder}
              className="w-full rounded border px-3 py-1.5 text-sm"
              rows={3}
            />
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder={t.ai.targetRole}
              className="w-full rounded border px-3 py-1.5 text-sm"
            />
          </>
        )}

        {mode === "experience" && (
          <>
            <div className="flex gap-2">
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={t.ai.position}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t.ai.company}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.ai.descriptionPlaceholder}
              className="w-full rounded border px-3 py-1.5 text-sm"
              rows={3}
            />
          </>
        )}

        {mode === "cover-letter" && (
          <>
            <div className="flex gap-2">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.ai.fullName}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder={t.ai.targetRole}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t.ai.companyName}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder={t.ai.skillsComma}
                className="flex-1 rounded border px-3 py-1.5 text-sm"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.ai.experiencePlaceholder}
              className="w-full rounded border px-3 py-1.5 text-sm"
              rows={3}
            />
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded bg-gold-600 px-3 py-1.5 text-sm text-white hover:bg-gold-700 disabled:opacity-50 transition"
        >
          {loading ? t.ai.generating : mode === "summary" ? t.ai.improveSummary : mode === "experience" ? t.ai.improveDescription : t.ai.generateCoverLetter}
        </button>
      </div>
    </div>
  );
}
