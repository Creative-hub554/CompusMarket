"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

function NewTicketForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const productId = searchParams.get("productId");

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [order, setOrder] = useState<{
    id: string;
    orderNumber: string;
  } | null>(null);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(
    null,
  );

  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) setOrder(data);
        })
        .catch(() => {});
    }
    if (productId) {
      fetch(`/api/products/${productId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.id) setProduct(data);
        })
        .catch(() => {});
    }
  }, [orderId, productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, orderId, productId }),
      });
      const ticket = await res.json();
      router.push(`/support/${ticket.id}`);
    } catch {}
    setSending(false);
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Support</h1>
        <p className="text-gray-500 mb-4">
          Sign in to create a new support ticket.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-indigo-700 transition font-medium"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/support"
        className="text-gray-400 hover:text-gray-600 text-sm"
      >
        &larr; Back to Support
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">New Support Ticket</h1>

      {order && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
          Related to Order: <strong>{order.orderNumber}</strong>
        </div>
      )}
      {product && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Related to Product: <strong>{product.name}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            className="w-full rounded-lg border px-3 py-2 text-sm h-32"
            required
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-slate-900 px-6 py-2 text-sm text-white hover:bg-indigo-700 transition disabled:opacity-50 font-medium"
        >
          {sending ? "Sending..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-400">
          Loading...
        </div>
      }
    >
      <NewTicketForm />
    </Suspense>
  );
}
