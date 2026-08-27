"use client";

import React, { useEffect, useState } from "react";
import {
  getActiveBannerForSlot,
  purchaseBannerAd,
  uploadAdMedia,
  type AdSlot,
} from "@/lib/ads";

export default function MarketAdsPage() {
  const [slot, setSlot] = useState<AdSlot>("LEFT");
  const [duration, setDuration] = useState(5);
  const [price, setPrice] = useState(1);
  const [startAt, setStartAt] = useState<string | undefined>(undefined);
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    try {
      if (!mediaFile) throw new Error("Please select an image or video for your ad");
      setUploading(true);
      const uploaded = await uploadAdMedia(mediaFile, mediaType);
      setUploading(false);
      const data = await purchaseBannerAd({
        slot,
        durationMinutes: Number(duration),
        totalPrice: Number(price),
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        currency,
        imageUrl: mediaType === "image" ? uploaded.url : undefined,
        videoUrl: mediaType === "video" ? uploaded.url : undefined,
        clickUrl: clickUrl.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        altText: altText.trim() || undefined,
      });
      setResp(data);
      const refreshed = await getActiveBannerForSlot(slot);
      setActiveBanner(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setUploading(false);
      setSubmitting(false);
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

      <form onSubmit={submit} style={{ maxWidth: 640 }}>
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
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}>
            <option value="USD">USD</option>
            <option value="KHR">KHR</option>
          </select>
        </label>
        <br />
        <label>
          Start at
          <input type="datetime-local" onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <br />
        <label>
          Ad media
          <select value={mediaType} onChange={(e) => {
            setMediaType(e.target.value as "image" | "video");
            setMediaFile(null);
          }}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <input
            type="file"
            accept={mediaType === "image" ? "image/*" : "video/*"}
            required
            onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <br />
        <label>
          Ad title
          <input type="text" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <br />
        <label>
          Description
          <textarea value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <br />
        <label>
          Click URL
          <input type="url" value={clickUrl} placeholder="https://example.com" onChange={(e) => setClickUrl(e.target.value)} />
        </label>
        <br />
        <label>
          Image alt text
          <input type="text" value={altText} maxLength={160} onChange={(e) => setAltText(e.target.value)} />
        </label>
        <br />
        <button type="submit" disabled={submitting}>
          {uploading ? "Uploading..." : submitting ? "Purchasing..." : "Purchase"}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <pre>{JSON.stringify(resp, null, 2)}</pre>
    </div>
  );
}
