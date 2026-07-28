"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/useTranslation";

type Ticket = {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusStyles: Record<Ticket["status"], string> = {
  OPEN: "bg-[#1a2e1f] text-[#4ade80]",
  IN_PROGRESS: "bg-[#1a2638] text-[#60a5fa]",
  RESOLVED: "bg-[#1a1a1e] text-[#6b6b73]",
  CLOSED: "bg-[#1a1a1e] text-[#6b6b73]",
};

const statusLabels: Record<Ticket["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function SupportPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
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
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#fafafa] mb-4">Sign In Required</h1>
          <p className="text-[#a1a1aa] mb-4">Please sign in to access support.</p>
          <Link href="/login" className="text-[#60a5fa] font-medium hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0b]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-[#1a1a1e] rounded animate-pulse mb-8" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0d0d0f] border border-[#1a1a1e] rounded-xl p-4">
                <div className="h-5 w-3/4 bg-[#1a1a1e] rounded animate-pulse mb-3" />
                <div className="h-4 w-1/2 bg-[#1a1a1e] rounded animate-pulse mb-2" />
                <div className="h-3 w-1/4 bg-[#1a1a1e] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0b]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[#fafafa]">Support</h1>
          <button
            onClick={() => router.push("/support/new")}
            className="bg-[#fafafa] text-[#0a0a0b] rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#e3e3e6] transition-colors"
          >
            New Ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6b6b73] text-lg">No support tickets yet</p>
            <p className="text-[#52525b] text-sm mt-2">Create a ticket and we&apos;ll get back to you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="block bg-[#0d0d0f] border border-[#1a1a1e] rounded-xl p-4 hover:bg-[#141416] transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-[#fafafa] font-medium text-base truncate pr-4">
                    {ticket.subject}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[ticket.status]}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <p className="text-[#6b6b73] text-sm truncate mb-2">
                  {ticket.lastMessage || "No messages yet"}
                </p>
                <p className="text-[#52525b] text-xs">
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
