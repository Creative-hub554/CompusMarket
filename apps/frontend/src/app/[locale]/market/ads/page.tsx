"use client";

import React, { useEffect, useState } from "react";
import { getActiveBannerForSlot, purchaseBannerAd, type AdSlot } from "@/lib/ads";

export default function MarketAdsPage() {
  const [slot, setSlot] = useState<AdSlot>("LEFT");
  const [duration, setDuration] = useState(5);
  const [price, setPrice] = useState(1);
  const [startAt, setStartAt] = useState<string | undefined>(undefined);
  const [resp, setResp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveBannerForSlot(slot)
      .then((data) => {
        if (!cancelled) setActiveBanner(data);
      })
      .catch(() => {
        if (!cancelled) setActiveBanner(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await purchaseBannerAd({
        slot,
        durationMinutes: Number(duration),
        totalPrice: Number(price),
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        currency: "USD",
      });
      setResp(data);
      const refreshed = await getActiveBannerForSlot(slot);
      setActiveBanner(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    }
  }

  return (
    <div className="page">
      <h1>Buy Marketplace Banner Slot</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Current active banner for {slot}</h2>
        {activeBanner ? (
          <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
            <div><strong>Slot:</strong> {activeBanner.slot}</div>
            <div><strong>Starts:</strong> {new Date(activeBanner.startAt).toLocaleString()}</div>
            <div><strong>Duration:</strong> {activeBanner.durationMinutes} minutes</div>
            <div><strong>Price:</strong> {activeBanner.totalPrice} {activeBanner.currency}</div>
          </div>
        ) : (
          <p>No active banner for this slot right now.</p>
        )}
      </section>

      <form onSubmit={submit}>
        <label>
          Slot
          <select value={slot} onChange={(e) => setSlot(e.target.value as AdSlot)}>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
            <option value="BOTTOM">Bottom</option>
          </select>
        </label>
        <br />
        <label>
          Duration (minutes)
          <input type="number" value={duration} min={5} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
        <br />
        <label>
          Total price
          <input type="number" value={price} min={1} step={0.01} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
        <br />
        <label>
          Start at
          <input type="datetime-local" onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <br />
        <button type="submit">Purchase</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <pre>{JSON.stringify(resp, null, 2)}</pre>
    </div>
  );
}
