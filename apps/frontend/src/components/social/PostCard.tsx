"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "./Avatar";
import { timeAgo } from "@/lib/social";

type Media = { id: string; kind: "IMAGE" | "VIDEO"; url: string; thumbUrl?: string | null };

const MENTION_RE = /@([a-zA-Z0-9_.]{2,20})/g;

/** Linkify @username tokens to profile pages. */
function renderContent(content: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of content.matchAll(MENTION_RE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(content.slice(last, at));
    parts.push(
      <Link
        key={`${match[1]}-${at}`}
        href={`/profile/${match[1]}`}
        className="text-gold-600 dark:text-gold-400 font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{match[1]}
      </Link>
    );
    last = at + match[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return parts;
}

export type FeedPost = {
  pinned?: boolean;
  bookmarked?: boolean;
  group?: { id: string; name: string } | null;
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
          <Image key={m.id} src={m.url} alt="" width={800} height={420} className="w-full h-full object-cover max-h-[420px]" />
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
  onTogglePin,
}: {
  post: FeedPost;
  onDeleted?: (id: string) => void;
  onTogglePin?: (pinned: boolean) => void;
}) {
  const { data: session } = useSession();
  const meId = session?.user?.id;
  const [reactions, setReactions] = useState(post.reactions);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
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

  async function toggleBookmark() {
    const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: "POST" });
    if (res.ok) {
      const { bookmarked: saved } = await res.json();
      setBookmarked(saved);
    }
  }

  return (
    <article className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow">
      {post.pinned && (
        <p className="px-4 pt-3 text-xs font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1">
          📌 Pinned
        </p>
      )}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Link href={`/profile/${post.author.id}`}>
          <Avatar user={post.author} size={44} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline truncate block">
            {post.author.name || post.author.username || "Anonymous"}
          </Link>
          <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
            {timeAgo(post.createdAt)}
            {post.author.username ? ` · @${post.author.username}` : ""}
            {post.group && (
              <>
                <span aria-hidden>▸</span>
                <Link
                  href={`/community/groups/${post.group.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold px-2 py-0.5 hover:underline"
                >
                  👥 {post.group.name}
                </Link>
              </>
            )}
          </p>
        </div>
        {onTogglePin && (
          <button
            onClick={() => onTogglePin(!post.pinned)}
            aria-label={post.pinned ? "Unpin post" : "Pin post"}
            title={post.pinned ? "Unpin post" : "Pin post"}
            className={`px-2 transition-colors ${
              post.pinned
                ? "text-gold-500"
                : "text-gray-300 hover:text-gold-500"
            }`}
          >
            📌
          </button>
        )}
        {meId && (
          <button
            onClick={toggleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Save post"}
            title={bookmarked ? "Remove bookmark" : "Save post"}
            className={`px-2 text-lg transition-colors ${
              bookmarked
                ? "text-gold-500"
                : "text-gray-300 hover:text-gold-500"
            }`}
          >
            {bookmarked ? "🔖" : "📑"}
          </button>
        )}
        {meId === post.author.id && (
          <button onClick={removePost} aria-label="Delete post" className="text-gray-300 hover:text-red-500 px-2 text-lg" title="Delete post">            ×
          </button>
        )}
      </div>

      {post.content && (
        <p className="px-4 pb-1 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
          {renderContent(post.content)}
        </p>
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
              myReaction ? "bg-gold-50 dark:bg-gold-950/40 text-gold-600" : "text-gray-500 dark:text-gray-400 hover:bg-[var(--surface-2)]"
            }`}
          >
            {myReaction || "👍"} React
          </button>
          {showPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-[var(--surface)] rounded-full shadow-lg border border-gray-100 px-2 py-1.5 flex gap-1 z-10">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => react(emoji)}
                  aria-label={`React with ${emoji}`}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={loadComments} className="rounded-full px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-[var(--surface-2)]">
          💬 Comment{commentCount > 0 ? ` · ${commentCount}` : ""}
        </button>
        {totalReactions > 0 && (
          <span className="ml-auto text-xs text-gray-400 pr-1">
            {reactions.map((r) => r.emoji).join(" ")} {totalReactions}
          </span>
        )}
      </div>

      {showComments && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-[var(--surface-2)] rounded-b-2xl">
          {comments === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2 items-start">
                <Avatar user={c.author} size={28} />
                <div className="bg-[var(--surface)] rounded-xl px-3 py-2 flex-1 border border-gray-100">
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
                    aria-label="Delete comment"
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
              className="flex-1 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
            <button
              onClick={submitComment}
              disabled={!commentInput.trim()}
              className="text-gold-600 font-medium text-sm px-3 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
