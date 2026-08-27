"use client";

import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  getActiveBannerForSlot,
  getAdSlotPricing,
  purchaseBannerAd,
  uploadAdMedia,
  type AdSlot,
} from "@/lib/ads";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function MarketAdsForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [slot, setSlot] = useState<AdSlot>("LEFT");
  const [duration, setDuration] = useState(5);
  const [price, setPrice] = useState(1);
  const [pricing, setPricing] = useState<Array<{ slot: AdSlot; price: number | string; currency: string; durationMinutes: number }>>([]);
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    getAdSlotPricing()
      .then((data) => {
        if (!Array.isArray(data)) return;
        setPricing(data);
        const configured = data.find((item) => item.slot === slot);
        if (configured) {
          setPrice(Number(configured.price));
          setDuration(configured.durationMinutes);
          setCurrency(configured.currency === "KHR" ? "KHR" : "USD");
        }
      })
      .catch(() => setPricing([]));
  }, [slot]);

  useEffect(() => {
    if (!mediaFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

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
      if (data.clientSecret && stripePromise) {
        if (!stripe || !elements) {
          throw new Error("Stripe checkout is not ready. Please try again.");
        }
        const card = elements.getElement(CardElement);
        if (!card) throw new Error("Enter your card details to continue.");
        const result = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card },
        });
        if (result.error) throw new Error(result.error.message || "Payment failed");
        if (result.paymentIntent?.status !== "succeeded") {
          throw new Error("Payment was not completed.");
        }
      }
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
          <input type="number" value={duration} min={5} readOnly={pricing.length > 0} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
        <br />
        <label>
          Total price
          <input type="number" value={price} min={1} step={0.01} readOnly={pricing.length > 0} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
        <br />
        <label>
          Currency
          <select value={currency} disabled={pricing.length > 0} onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}>
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
        {previewUrl && (
          <div style={{ marginBottom: 16 }}>
            <strong>Creative preview</strong>
            {mediaType === "image" ? (
              <img src={previewUrl} alt={altText || "Ad preview"} style={{ display: "block", maxWidth: "100%", maxHeight: 220, marginTop: 8 }} />
            ) : (
              <video src={previewUrl} controls muted playsInline style={{ display: "block", maxWidth: "100%", maxHeight: 220, marginTop: 8 }} />
            )}
          </div>
        )}
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
        {stripePromise && (
          <div style={{ margin: "16px 0", padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
            <strong>Payment details</strong>
            <div style={{ marginTop: 10, padding: 10, border: "1px solid #ddd", borderRadius: 4 }}>
              <CardElement options={{ hidePostalCode: true }} />
            </div>
          </div>
        )}
        <button type="submit" disabled={submitting}>
          {uploading ? "Uploading..." : submitting ? "Purchasing..." : "Purchase"}
        </button>
      </form>
      {pricing.length > 0 && (
        <p style={{ marginTop: 16, color: "#666" }}>
          Configured rate for {slot}: {String(price)} {currency} / {duration} minutes.
        </p>
      )}
      {error ? <p role="alert">{error}</p> : null}
      {resp && (
        <div role="status" style={{ marginTop: 16, padding: 12, border: "1px solid #b7dfc5", borderRadius: 8 }}>
          <strong>{resp.clientSecret ? "Payment pending" : "Ad submitted"}</strong>
          <p>
            {resp.clientSecret
              ? "Your ad is awaiting Stripe payment confirmation and admin approval."
              : "Your ad was submitted for admin approval and will appear after approval."}
          </p>
        </div>
      )}
    </div>
  );
}

export default function MarketAdsPage() {
  return (
    <Elements stripe={stripePromise}>
      <MarketAdsForm />
    </Elements>
  );
}
