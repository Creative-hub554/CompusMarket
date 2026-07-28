"use client";

import { useState } from "react";

type Props = {
  onDescription: (text: string) => void;
  productName?: string;
  category?: string;
  condition?: string;
};

export function AiProductDescription({ onDescription, productName = "", category = "", condition = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(productName);
  const [cat, setCat] = useState(category);
  const [cond, setCond] = useState(condition);
  const [keywords, setKeywords] = useState("");

  async function generate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "describe-product",
          data: { name, category: cat, condition: cond, keywords },
        }),
      });
      const json = await res.json();
      if (json.result) onDescription(json.result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-3">AI Product Description</h3>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          className="w-full rounded border px-3 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="Category"
            className="flex-1 rounded border px-3 py-1.5 text-sm"
          />
          <select
            value={cond}
            onChange={(e) => setCond(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
          >
            <option value="">Condition</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>
        </div>
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Keywords (optional)"
          className="w-full rounded border px-3 py-1.5 text-sm"
        />
        <button
          onClick={generate}
          disabled={loading || !name.trim()}
          className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Generating..." : "Generate Description"}
        </button>
      </div>

    </div>
  );
}
