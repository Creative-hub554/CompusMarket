"use client";

import React, { useState } from "react";
import { createAdCampaign, type CampaignObjective } from "@/lib/ads";

export default function CreateCampaignPage() {
  const [postId, setPostId] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("VIDEO_VIEWS");
  const [dailyBudget, setDailyBudget] = useState(5);
  const [lifetimeBudget, setLifetimeBudget] = useState<number | undefined>(undefined);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await createAdCampaign({
        postId: postId || undefined,
        objective,
        dailyBudget: Number(dailyBudget),
        lifetimeBudget: lifetimeBudget ? Number(lifetimeBudget) : undefined,
        currency: "USD",
      });
      setResp(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign creation failed");
    }
  }

  return (
    <div className="page">
      <h1>Create Boost Campaign</h1>
      <form onSubmit={submit}>
        <label>
          Post ID (optional)
          <input value={postId} onChange={(e) => setPostId(e.target.value)} />
        </label>
        <br />
        <label>
          Objective
          <select value={objective} onChange={(e) => setObjective(e.target.value as CampaignObjective)}>
            <option value="VIDEO_VIEWS">Video Views</option>
            <option value="ENGAGEMENT">Engagement</option>
            <option value="BRAND_AWARENESS">Brand Awareness</option>
            <option value="TRAFFIC">Traffic</option>
          </select>
        </label>
        <br />
        <label>
          Daily Budget
          <input type="number" value={dailyBudget} min={1} onChange={(e) => setDailyBudget(Number(e.target.value))} />
        </label>
        <br />
        <label>
          Lifetime Budget (optional)
          <input type="number" value={lifetimeBudget ?? ""} onChange={(e) => setLifetimeBudget(e.target.value ? Number(e.target.value) : undefined)} />
        </label>
        <br />
        <button type="submit">Create Campaign</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <pre>{JSON.stringify(resp, null, 2)}</pre>
    </div>
  );
}
