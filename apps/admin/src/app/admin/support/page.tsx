"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export const dynamic = "force-dynamic";

type Ticket = {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  customer: { name: string | null };
  _count: { messages: number };
  messages: { content: string }[];
};

const statusColors: Record<string, string> = {
  OPEN: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-gray-100 text-gray-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const statusOptions = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminSupportPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (!session) return;
    fetch("/api/admin/support/tickets")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setTickets)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) return <div>Loading...</div>;

  if (loading) return <div>Loading...</div>;

  if (error) return <div className="text-red-600">Failed to load tickets. Admin access required.</div>;

  const filtered = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Support Tickets</h1>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded px-3 py-1.5 text-sm border bg-white"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All" : statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No support tickets</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => router.push(`/admin/support/${ticket.id}`)}
              className="rounded-lg border p-4 hover:border-blue-300 transition cursor-pointer bg-white"
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-medium truncate pr-4">{ticket.subject}</h3>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${
                    statusColors[ticket.status]
                  }`}
                >
                  {statusLabels[ticket.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {ticket.customer.name || "Unknown"}
              </p>
              <p className="text-sm text-gray-400 truncate mt-1">
                {ticket.messages[0]?.content || "No messages yet"}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(ticket.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
