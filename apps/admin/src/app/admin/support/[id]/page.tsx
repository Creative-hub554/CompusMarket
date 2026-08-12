"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";

type Sender = {
  id: string;
  name: string | null;
  role: string;
};

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  sender: Sender;
};

type Ticket = {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  orderId: string | null;
  productId: string | null;
  order: { id: string; orderNumber: string } | null;
  product: { id: string; name: string } | null;
  customer: { id: string; name: string | null; email: string };
  messages: Message[];
  createdAt: string;
  updatedAt: string;
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

const statusOptions = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/admin/support/tickets/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: Ticket) => {
        setTicket(data);
        setMessages(data.messages || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    fetch("/api/auth/token")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const s = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", {
          query: { token: d.token },
          transports: ["websocket", "polling"],
        });
        s.on("connect", () => s.emit("joinSupportTicket", { ticketId: id }));
        s.on("newSupportMessage", (msg: Message) => {
          setMessages((prev) => [...prev, msg]);
        });
        socketRef.current = s;
      });
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [id, session?.user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function updateStatus(status: string) {
    setStatusUpdating(true);
    const res = await fetch(`/api/admin/support/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok && ticket) {
      setTicket({ ...ticket, status: status as Ticket["status"] });
    }
    setStatusUpdating(false);
  }

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("sendSupportMessage", {
      ticketId: id,
      content: input,
    });
    setInput("");
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Ticket not found</div>;
  if (!ticket) return <div className="text-red-600">Ticket not found</div>;

  return (
    <div>
      <Link href="/admin/support" className="text-sm text-blue-600 hover:underline mb-4 block">
        &larr; Back to Support Tickets
      </Link>

      <div className="flex gap-6">
        <div className="w-[60%] flex flex-col">
          <div className="rounded-lg border p-4 bg-white mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">{ticket.subject}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {ticket.customer.name || ticket.customer.email}
                </p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${statusColors[ticket.status]}`}
              >
                {statusLabels[ticket.status]}
              </span>
            </div>
          </div>

          <div className="h-[60vh] overflow-y-auto space-y-3 p-4 bg-white rounded-lg border mb-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-sm">No messages yet</p>
              </div>
            )}
            {messages.map((msg) => {
              const isAdmin = msg.sender.role === "ADMIN";
              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] ${
                      isAdmin
                        ? "bg-slate-900 text-white rounded-xl rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-xl rounded-bl-md"
                    } px-4 py-2.5 text-sm`}
                  >
                    <p>{msg.content}</p>
                    <div className={`text-xs text-gray-400 mt-0.5 ${isAdmin ? "text-right" : "text-left"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Send
            </button>
          </div>
        </div>

        <div className="w-[40%]">
          <div className="rounded-lg border p-4 bg-white space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Status</h3>
              <select
                value={ticket.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={statusUpdating}
                className="rounded px-2 py-1 text-sm border w-full"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Customer</h3>
              <p className="text-sm font-medium">
                {ticket.customer.name || "No name"}
              </p>
              <p className="text-sm text-gray-500">{ticket.customer.email}</p>
            </div>

            {(ticket.orderId || ticket.productId) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Context</h3>
                {ticket.order && (
                  <Link
                    href={`/admin/orders/${ticket.order.id}`}
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    Order #{ticket.order.orderNumber}
                  </Link>
                )}
                {ticket.product && (
                  <Link
                    href={`/admin/products/${ticket.product.id}`}
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    Product: {ticket.product.name}
                  </Link>
                )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Created</h3>
              <p className="text-sm">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Updated</h3>
              <p className="text-sm">
                {new Date(ticket.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
