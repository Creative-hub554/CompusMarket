"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [otherName, setOtherName] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    fetch(`/api/conversations/${id}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data);
      });

    fetch("/api/conversations")
      .then((r) => r.json())
      .then((convs) => {
        const conv = convs.find((c: any) => c.id === id);
        if (conv) {
          const other =
            conv.buyerId === userId ? conv.seller.user : conv.buyer;
          setOtherName(other.name || other.email);
        }
      });
  }, [id, session?.user?.id]);

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
          socket.emit("joinConversation", { conversationId: id });
        });
        socket.on("newMessage", (msg: Message) => {
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
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-gray-600 mb-4">Please sign in to view messages.</p>
        <Link href="/login" className="text-khmer-blue font-medium hover:underline">Go to Login</Link>
      </div>
    );
  }

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      conversationId: id,
      content: input,
    });
    setInput("");
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-xl font-bold mb-4">{otherName || "Chat"}</h1>

      <div className="border rounded-lg h-96 overflow-y-auto p-4 mb-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-12">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === session.user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  isMe ? "bg-blue-600 text-white" : "bg-white border"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
