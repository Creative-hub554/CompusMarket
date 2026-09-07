"use client";

import { useEffect, useState } from "react";

type AdSlot = "LEFT" | "RIGHT" | "BOTTOM";

type Pricing = {
  id: string;
  slot: AdSlot;
  price: number | string;
  currency: "USD" | "KHR";
  durationMinutes: number;
  isActive: boolean;
};

const SLOTS: AdSlot[] = ["LEFT", "RIGHT", "BOTTOM"];

export default function AdminAdsPage() {
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<AdSlot | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/ads/pricing")
      .then(async (response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json() as Promise<Pricing[]>;
      })
      .then(setPricing)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function update(slot: AdSlot, field: keyof Pricing, value: string | boolean) {
    setPricing((current) =>
      current.map((item) =>
        item.slot === slot ? { ...item, [field]: field === "durationMinutes" ? Number(value) : value } : item,
      ),
    );
  }

  async function save(item: Pricing) {
    setSaving(item.slot);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ads/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: item.slot,
          price: item.price,
          currency: item.currency,
          durationMinutes: item.durationMinutes,
          isActive: item.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save pricing");
      setPricing((current) => current.map((entry) => (entry.slot === item.slot ? data : entry)));
      setMessage(`${item.slot} pricing saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pricing");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Advertising</h1>
        <p className="mt-1 text-sm text-slate-500">Configure the public marketplace banner prices and durations.</p>
      </div>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading pricing...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Slot</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Currency</th>
                <th className="px-4 py-3 text-left font-medium">Duration (minutes)</th>
                <th className="px-4 py-3 text-left font-medium">Active</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SLOTS.map((slot) => {
                const item = pricing.find((entry) => entry.slot === slot);
                if (!item) {
                  return (
                    <tr key={slot}>
                      <td colSpan={6} className="px-4 py-4 text-slate-500">{slot}: not configured</td>
                    </tr>
                  );
                }
                return (
                  <tr key={slot} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{item.slot}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.price}
                        onChange={(event) => update(item.slot, "price", event.target.value)}
                        className="w-28 rounded border px-2 py-1.5"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.currency}
                        onChange={(event) => update(item.slot, "currency", event.target.value)}
                        className="rounded border px-2 py-1.5"
                      >
                        <option value="USD">USD</option>
                        <option value="KHR">KHR</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.durationMinutes}
                        onChange={(event) => update(item.slot, "durationMinutes", event.target.value)}
                        className="w-32 rounded border px-2 py-1.5"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(event) => update(item.slot, "isActive", event.target.checked)}
                        aria-label={`Enable ${item.slot} pricing`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => save(item)}
                        disabled={saving === item.slot}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving === item.slot ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
