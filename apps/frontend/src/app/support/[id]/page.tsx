"use client";

import { useEffect, useState, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
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
};

const statusStyles: Record<Ticket["status"], string> = {
  OPEN: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  RESOLVED: "bg-slate-100 text-slate-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

const statusLabels: Record<Ticket["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/support/tickets/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: Ticket) => {
        setTicket(data);
        setMessages(data.messages || []);
      })
      .catch(() => setTicket(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    fetch("/api/auth/token")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", {
          query: { token: d.token },
          transports: ["websocket", "polling"],
        });
        socket.on("connect", () => {
          socket.emit("joinSupportTicket", { ticketId: id });
        });
        socket.on("newSupportMessage", (msg: Message) => {
          setMessages((prev) => [...prev, msg]);
        });
        socketRef.current = socket;
      });
    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [id, session?.user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Sign In Required</h1>
          <p className="text-slate-500 mb-4">Please sign in to view this ticket.</p>
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Ticket not found</p>
          <Link href="/support" className="text-indigo-600 font-medium hover:underline">Back to Support</Link>
        </div>
      </div>
    );
  }

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("sendSupportMessage", {
      ticketId: id,
      content: input,
    });
    setInput("");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white flex flex-col">
      <div className="border-b border-slate-200 px-6 py-4">
        <Link href="/support" className="text-slate-500 text-sm hover:text-slate-900 transition-colors mb-2 inline-block">
          &larr; Back to Support
        </Link>
        <h1 className="text-lg font-bold text-slate-900">{ticket.subject}</h1>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-slate-500 text-sm">{ticket.customer.name || ticket.customer.email}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[ticket.status]}`}>
            {statusLabels[ticket.status]}
          </span>
        </div>
      </div>

      {(ticket.orderId || ticket.productId) && (
        <div className="mx-6 mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          {ticket.order ? (
            <>
              <span className="text-indigo-600 text-lg">&#x1F4E6;</span>
              <div className="flex-1">
                <p className="text-slate-900 text-sm font-medium">Regarding Order</p>
                <p className="text-slate-500 text-xs">#{ticket.order.orderNumber}</p>
              </div>
              <Link href={`/orders/${ticket.order.id}`} className="text-indigo-600 text-sm hover:underline">
                View Order
              </Link>
            </>
          ) : (
            <>
              <span className="text-indigo-600 text-lg">&#x1F50D;</span>
              <div className="flex-1">
                <p className="text-slate-900 text-sm font-medium">Regarding Product</p>
                <p className="text-slate-500 text-xs">{ticket.product?.name}</p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-sm">No messages yet</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === session.user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-2xl rounded-br-md"
                    : "bg-slate-100 text-slate-900 rounded-2xl rounded-bl-md"
                } px-4 py-2.5 text-sm`}
              >
                <p>{msg.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                  <span className={`text-[11px] ${isMe ? "text-indigo-200" : "text-slate-500"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isMe && (
                    <span className={`text-[11px] ${msg.readAt ? "text-indigo-200" : "text-indigo-300"}`}>
                      {msg.readAt ? "\u2713\u2713" : "\u2713"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 px-6 py-4">
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
            rows={1}
            className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 outline-none transition-colors resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-indigo-600 text-white rounded-lg px-5 py-3 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
