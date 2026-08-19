"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { useAuthedFetch } from "@/lib/useAuthedFetch";

export function JobMatcher() {
  const { t } = useTranslation();
  const authedFetch = useAuthedFetch();
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/resumes", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setHasResume(Array.isArray(data) && data.length > 0);
          if (!hasResume) setShowResumePrompt(true);
        }
      } catch {}
    })();
  }, [authedFetch, hasResume]);

  const handleCreateResume = () => {
    window.location.href = "/community/resume";
  };

  return (
    <div className="space-y-4">
      {hasResume && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✓ Resume found</h3>
          <p className="text-green-700 text-sm">We can match your resume to the right career articles. Click below to start matching.</p>
          <button
            onClick={() => document.getElementById("job-matcher-form")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded"
          >
            Match My Resume
          </button>
        </div>
      )}

      {showResumePrompt && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">📝 Create a resume to get personalized recommendations</h3>
          <p className="text-amber-700 text-sm mb-3">
            Build a professional resume in minutes and get AI-matched career articles that fit your profile.
          </p>
          <button
            onClick={handleCreateResume}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded"
          >
            Create Resume Now
          </button>
        </div>
      )}
    </div>
  );
}
