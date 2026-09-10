"use client";

import { useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "./Avatar";
import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReportButton } from "./ReportButton";
import { timeAgo } from "@/lib/social";
import { apiFetch, handleApiError } from "@/lib/apiFetch";
import { useHandleApiError } from "@/lib/useHandleApiError";
import { toast } from "@/components/ui/toast";
import { PostMediaCarousel } from "./PostMediaCarousel";
import type { PostMediaInput } from "@/lib/post-media";

type Media = PostMediaInput & { id: string; thumbUrl?: string | null };

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
  page?: { id: string; name: string; username: string; image: string | null } | null;
  boostedUntil?: string | null;
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

export function PostCard({
  post,
  onDeleted,
  onEdited,
  onTogglePin,
  pageViewerRole,
}: {
  post: FeedPost;
  onDeleted?: (id: string) => void;
  onEdited?: (post: FeedPost) => void;
  onTogglePin?: (pinned: boolean) => void;
  /** Viewer's role on the page this post belongs to. Only page staff see the boost button. */
  pageViewerRole?: "OWNER" | "EDITOR" | null;
}) {
  const { data: session } = useSession();
  const meId = session?.user?.id;
  const _handleApiError = useHandleApiError();
  const tBoost = useTranslations("pages");
  const isBoosted = Boolean(post.boostedUntil && new Date(post.boostedUntil) > new Date());
  const [boosting, setBoosting] = useState(false);
  const [reactions, setReactions] = useState(post.reactions);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [myReaction, setMyReaction] = useState<string | null>(post.viewerReaction);
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentT[] | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [content, setContent] = useState(post.content);
  const [editing, setEditing] = useState(false);
  const [editingDraft, setEditingDraft] = useState(post.content);

  async function react(emoji: string) {
    setShowPicker(false);
    try {
      const data = await apiFetch<{ reactions: typeof reactions; viewerReaction: string | null }>(`/api/posts/${post.id}/react`, {
        method: "POST",
        body: { emoji },
      });
      setReactions(data.reactions);
      setMyReaction(data.viewerReaction);
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "react to the post", false, true, () =>
        apiFetch<{ reactions: typeof reactions; viewerReaction: string | null }>(`/api/posts/${post.id}/react`, {
          method: "POST",
          body: { emoji },
        }),
      );
      if (retryResult) {
        setReactions((retryResult as { reactions: typeof reactions }).reactions);
        setMyReaction((retryResult as { viewerReaction: string | null }).viewerReaction);
      }
    }
  }

  async function loadComments() {
    setShowComments((v) => !v);
    if (!comments) {
      try {
        setComments(await apiFetch<CommentT[]>(`/api/posts/${post.id}/comments`));
      } catch (err) {
        await handleApiError(err, "load comments", true);
      }
    }
  }

  async function submitComment() {
    const content = commentInput.trim();
    if (!content) return;
    try {
      const comment = await apiFetch<CommentT>(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: { content },
      });
      setComments((prev) => [...(prev ?? []), comment]);
      setCommentInput("");
      setCommentCount((c) => c + 1);
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "comment on the post", false, true, () =>
        apiFetch<CommentT>(`/api/posts/${post.id}/comments`, {
          method: "POST",
          body: { content },
        }),
      );
      if (retryResult) {
        setComments((prev) => [...(prev ?? []), retryResult as CommentT]);
        setCommentInput("");
        setCommentCount((c) => c + 1);
      }
    }
  }

  async function removePost() {
    if (!confirm("Delete this post?")) return;
    try {
      await apiFetch(`/api/posts/${post.id}`, { method: "DELETE" });
      onDeleted?.(post.id);
    } catch (err) {
      await _handleApiError(err, "delete the post");
    }
  }

  async function boostPost() {
    if (!post.page) return;
    setBoosting(true);
    try {
      const res = await apiFetch<{ boostedUntil: string }>(
        `/api/pages/${post.page.id}/posts/${post.id}/boost`,
        { method: "POST" }
      );
      onEdited?.({ ...post, boostedUntil: res.boostedUntil });
      toast.success(tBoost("boostDone"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tBoost("boostFailed"));
    }
    setBoosting(false);
  }

  async function saveEdit() {
    const next = editingDraft.trim();
    if (!next || next === content) {
      setEditing(false);
      setEditingDraft(content);
      return;
    }
    try {
      const updated = await apiFetch<FeedPost>(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: { content: next },
      });
      setContent(updated.content);
      setEditing(false);
      onEdited?.(updated);
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "save your edit", false, true, () =>
        apiFetch<FeedPost>(`/api/posts/${post.id}`, {
          method: "PATCH",
          body: { content: next },
        }),
      );
      if (retryResult) {
        setContent((retryResult as FeedPost).content);
        setEditing(false);
        onEdited?.(retryResult as FeedPost);
      }
    }
  }

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  async function toggleBookmark() {
    try {
      const { bookmarked: saved } = await apiFetch<{ bookmarked: boolean }>(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      setBookmarked(saved);
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "save the post", false, true, () =>
        apiFetch<{ bookmarked: boolean }>(`/api/posts/${post.id}/bookmark`, { method: "POST" }),
      );
      if (retryResult !== undefined) {
        setBookmarked((retryResult as { bookmarked: boolean }).bookmarked);
      }
    }
  }

  return (
    <article className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-shadow">
      {post.pinned && (
        <p className="px-4 pt-3 text-xs font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1">
          📌 Pinned
        </p>
      )}
      {post.boostedUntil && new Date(post.boostedUntil) > new Date() && (
        <p className="px-4 pt-3 text-xs font-semibold text-gold-600 dark:text-gold-400 flex items-center gap-1">
          🚀 Boosted
        </p>
      )}
      <div className="flex items-center gap-3 p-4 pb-2">
        {post.page ? (
          <Link href={`/pages/${post.page.username}`}>
            <Avatar user={{ name: post.page.name, image: post.page.image }} size={44} />
          </Link>
        ) : (
          <Link href={`/profile/${post.author.id}`}>
            <Avatar user={post.author} size={44} />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          {post.page ? (
            <Link href={`/pages/${post.page.username}`} className="font-semibold hover:underline truncate block inline-flex items-center gap-1">
              {post.page.name}
              <BadgeCheck size={14} className="text-gold-500 shrink-0" />
            </Link>
          ) : (
            <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline truncate block">
              {post.author.name || post.author.username || "Anonymous"}
            </Link>
          )}
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
          <>
            <button
              onClick={() => {
                setEditingDraft(content);
                setEditing((v) => !v);
              }}
              aria-label="Edit post"
              className={`px-2 text-sm transition-colors ${
                editing ? "text-gold-500" : "text-gray-300 hover:text-gold-500"
              }`}
              title="Edit post"
            >
              ✎
            </button>
            <button onClick={removePost} aria-label="Delete post" className="text-gray-300 hover:text-red-500 px-2 text-lg" title="Delete post">            ×
            </button>
          </>
        )}
        {post.page && pageViewerRole && meId && (
          <button
            onClick={boostPost}
            disabled={boosting || isBoosted}
            aria-label={isBoosted ? tBoost("boostActive") : tBoost("boost")}
            title={tBoost("boostHint")}
            className={`px-2 text-sm transition-colors ${
              isBoosted ? "text-gold-500" : "text-gray-300 hover:text-gold-500"
            }`}
          >
            🚀
          </button>
        )}
        {meId && meId !== post.author.id && (
          <ReportButton targetType="POST" targetId={post.id} />
        )}
      </div>

      {editing ? (
        <div className="px-4 pb-1">
          <textarea
            value={editingDraft}
            onChange={(e) => setEditingDraft(e.target.value)}
            rows={3}
            autoFocus
            className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold-300 bg-[var(--surface)]"
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={saveEdit}
              disabled={!editingDraft.trim()}
              className="btn-primary px-3 py-1 text-xs"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditingDraft(content);
              }}
              className="btn-ghost px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        content && (
        <p className="px-4 pb-1 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
          {renderContent(content)}
        </p>
        )
      )}

      <div className="px-4">
        <PostMediaCarousel media={post.media} />
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
                      try {
                        await apiFetch(`/api/comments/${c.id}`, { method: "DELETE" });
                        setComments((prev) => (prev ?? []).filter((x) => x.id !== c.id));
                        setCommentCount((n) => n - 1);
                      } catch (err) {
                        await _handleApiError(err, "delete your comment");
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
