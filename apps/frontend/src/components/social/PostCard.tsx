"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Avatar } from "./Avatar";
import { timeAgo } from "@/lib/social";

type Media = { id: string; kind: "IMAGE" | "VIDEO"; url: string; thumbUrl?: string | null };

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; username: string | null; image: string | null };
  media: Media[];
  reactions: { emoji: string; count: number }[];
  commentCount: number;
  viewerReaction: string | null;
};

type CommentT = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: { id: string; name: string | null; username: string | null; image: string | null };
};

const EMOJIS = ["👍", "❤️", "😂", "😮", "🔥"];

function MediaGrid({ media }: { media: Media[] }) {
  if (media.length === 0) return null;
  return (
    <div className={`grid gap-1 mt-3 rounded-xl overflow-hidden ${media.length > 1 ? "grid-cols-2" : ""}`}>
      {media.map((m) =>
        m.kind === "IMAGE" ? (
          <img key={m.id} src={m.url} alt="" className="w-full h-full object-cover max-h-[420px]" />
        ) : (
          <video key={m.id} src={m.url} controls className="w-full max-h-[420px] bg-black" />
        )
      )}
    </div>
  );
}

export function PostCard({
  post,
  onDeleted,
}: {
  post: FeedPost;
  onDeleted?: (id: string) => void;
}) {
  const { data: session } = useSession();
  const meId = session?.user?.id;
  const [reactions, setReactions] = useState(post.reactions);
  const [myReaction, setMyReaction] = useState<string | null>(post.viewerReaction);
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentT[] | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);

  async function react(emoji: string) {
    setShowPicker(false);
    const res = await fetch(`/api/posts/${post.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setReactions(data.reactions);
    setMyReaction(data.viewerReaction);
  }

  async function loadComments() {
    setShowComments((v) => !v);
    if (!comments) {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      if (res.ok) setComments(await res.json());
    }
  }

  async function submitComment() {
    const content = commentInput.trim();
    if (!content) return;
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return;
    const comment = await res.json();
    setComments((prev) => [...(prev ?? []), comment]);
    setCommentInput("");
    setCommentCount((c) => c + 1);
  }

  async function removePost() {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(post.id);
  }

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <article className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-4 pb-2">
        <Link href={`/profile/${post.author.id}`}>
          <Avatar user={post.author} size={44} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline truncate block">
            {post.author.name || post.author.username || "Anonymous"}
          </Link>
          <p className="text-xs text-gray-400">
            {timeAgo(post.createdAt)}
            {post.author.username ? ` · @${post.author.username}` : ""}
          </p>
        </div>
        {meId === post.author.id && (
          <button onClick={removePost} className="text-gray-300 hover:text-red-500 px-2 text-lg" title="Delete post">
            ×
          </button>
        )}
      </div>

      {post.content && (
        <p className="px-4 pb-1 whitespace-pre-wrap break-words text-slate-800">{post.content}</p>
      )}

      <div className="px-4">
        <MediaGrid media={post.media} />
      </div>

      <div className="flex items-center gap-1 px-3 py-2 mt-1 relative">
        <div className="relative">
          <button
            onClick={() => (myReaction ? react(myReaction) : setShowPicker((v) => !v))}
            onDoubleClick={() => setShowPicker(true)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              myReaction ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {myReaction || "👍"} React
          </button>
          {showPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1.5 flex gap-1 z-10">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={loadComments} className="rounded-full px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100">
          💬 Comment{commentCount > 0 ? ` · ${commentCount}` : ""}
        </button>
        {totalReactions > 0 && (
          <span className="ml-auto text-xs text-gray-400 pr-1">
            {reactions.map((r) => r.emoji).join(" ")} {totalReactions}
          </span>
        )}
      </div>

      {showComments && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50 rounded-b-2xl">
          {comments === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2 items-start">
                <Avatar user={c.author} size={28} />
                <div className="bg-white rounded-xl px-3 py-2 flex-1 border border-gray-100">
                  <p className="text-xs font-semibold">
                    {c.author.name || c.author.username || "Anonymous"}
                    <span className="ml-2 font-normal text-gray-400">{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
                {meId === c.author.id && (
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/comments/${c.id}`, { method: "DELETE" });
                      if (res.ok) {
                        setComments((prev) => (prev ?? []).filter((x) => x.id !== c.id));
                        setCommentCount((n) => n - 1);
                      }
                    }}
                    className="text-gray-300 hover:text-red-500 text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
          <div className="flex gap-2">
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Write a comment…"
              className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={submitComment}
              disabled={!commentInput.trim()}
              className="text-indigo-600 font-medium text-sm px-3 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
