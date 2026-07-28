"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Feedback = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
} | null;

type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  status: string;
  trackingNumber: string | null;
  feedback: Feedback;
  product: { id: string; name: string; price: number; images: string[] };
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

const itemStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PACKING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) setOrder(await res.json());
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const submitFeedback = async (itemId: string, rating: number, comment: string, images: string[]) => {
    const res = await fetch(`/api/orders/${id}/items/${itemId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment, images }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed");
      return;
    }
    fetchOrder();
  };

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-8">Loading...</div>;

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <Link href="/orders" className="text-khmer-blue hover:underline">
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold gold-underline">Order Confirmed</h1>
        <p className="text-gray-500 text-sm mt-3">
          Order #{order.id.slice(0, 8).toUpperCase()} &middot;{" "}
          {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                {item.product.images?.[0] ? (
                  <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs flex items-center justify-center h-full">No img</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/shop/${item.product.id}`} className="font-medium hover:text-khmer-blue">
                    {item.product.name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${itemStatusColors[item.status] || "bg-gray-100"}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {item.quantity} x ${Number(item.price).toLocaleString()}
                </p>
                {item.trackingNumber && (
                  <p className="text-xs text-gray-400 mt-1">Tracking: {item.trackingNumber}</p>
                )}

                {/* Timeline dots */}
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {["APPROVED", "PACKING", "SHIPPED", "DELIVERED"].map((step, i) => {
                    const statusOrder = ["PENDING", "APPROVED", "PACKING", "SHIPPED", "DELIVERED"];
                    const currentIdx = statusOrder.indexOf(item.status);
                    const stepIdx = i + 1;
                    const done = currentIdx >= stepIdx;
                    return (
                      <span key={step} className={`flex items-center gap-1 ${done ? "text-green-600" : "text-gray-300"}`}>
                        {i > 0 && <span className="w-2 border-t border-current" />}
                        <span className={`w-2 h-2 rounded-full ${done ? "bg-green-500" : "bg-gray-200"}`} />
                        <span>{step.charAt(0) + step.slice(1).toLowerCase()}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className="font-medium shrink-0">
                ${(Number(item.price) * item.quantity).toLocaleString()}
              </p>
            </div>

            {/* Feedback form for delivered items */}
            {item.status === "DELIVERED" && !item.feedback && (
              <FeedbackForm onSubmit={(rating, comment, images) => submitFeedback(item.id, rating, comment, images)} />
            )}

            {/* Existing feedback */}
            {item.feedback && (
              <div className="mt-3 pt-3 border-t bg-green-50 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  Your Review &middot; {item.feedback.rating}/5
                  <span className="text-yellow-500 ml-1">
                    {"★".repeat(item.feedback.rating)}{"☆".repeat(5 - item.feedback.rating)}
                  </span>
                </p>
                {item.feedback.comment && (
                  <p className="text-sm text-green-700 mt-1">&ldquo;{item.feedback.comment}&rdquo;</p>
                )}
                {item.feedback.images?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {item.feedback.images.map((url: string, i: number) => (
                      <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4 flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-khmer-red">${Number(order.total).toLocaleString()}</span>
      </div>

      <div className="mt-6 flex gap-4">
        <Link href="/orders" className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
          View All Orders
        </Link>
        <Link href="/shop" className="rounded-lg bg-khmer-blue px-4 py-2 text-sm text-white hover:bg-khmer-blue-light transition-colors">
          Continue Shopping
        </Link>
        <Link href={`/support/new?orderId=${order.id}`} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
          Contact Support
        </Link>
      </div>
    </div>
  );
}

function FeedbackForm({ onSubmit }: { onSubmit: (rating: number, comment: string, images: string[]) => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || images.length >= 3) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImages((prev) => [...prev, data.url]);
    } catch {
      alert("Upload failed");
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(rating, comment, images);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-sm font-medium mb-2">Leave Feedback</p>
      <div className="space-y-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-lg ${star <= rating ? "text-yellow-500" : "text-gray-200"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product (optional)"
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading || images.length >= 3}
            className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700"
          />
          {images.length > 0 && (
            <div className="flex gap-1">
              {images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-8 h-8 object-cover rounded border" />
              ))}
            </div>
          )}
          <span className="text-xs text-gray-400">Up to 3 photos</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-khmer-blue text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-khmer-blue-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}
