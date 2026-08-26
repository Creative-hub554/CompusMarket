"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";

type Ticket = {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusStyles: Record<Ticket["status"], string> = {
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-gold-100 text-gold-800",
  RESOLVED: "bg-[var(--surface-2)] text-slate-700 dark:text-slate-300",
  CLOSED: "bg-[var(--surface-2)] text-slate-700 dark:text-slate-300",
};

const statusLabels: Record<Ticket["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function SupportPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/support/tickets")
      .then((r) => r.json())
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[var(--surface)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Sign In Required</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Please sign in to access support.</p>
          <Link href="/login" className="text-gold-600 font-medium hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-4">
                <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Support</h1>
          <button
            onClick={() => router.push("/support/new")}
            className="bg-gold-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gold-700 transition-colors"
          >
            New Ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-600 dark:text-slate-300 text-lg">No support tickets yet</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Create a ticket and we&apos;ll get back to you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="block bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-4 hover:bg-[var(--surface-2)] transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-slate-900 dark:text-slate-100 font-medium text-base truncate pr-4">
                    {ticket.subject}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[ticket.status]}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm truncate mb-2">
                  {ticket.lastMessage || "No messages yet"}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
