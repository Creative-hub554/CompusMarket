"use client";

import { useState, useEffect, useCallback } from "react";

type AdminPost = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    role: string;
  };
  media: { id: string; kind: string; url: string; thumbUrl: string | null }[];
  _count: { comments: number; reactions: number };
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminModerationPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (q: string, cur: string | null, append: boolean) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cur) params.set("cursor", cur);
      const res = await fetch(`/api/admin/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
      setCursor(data.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query, null, false), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  async function removePost(id: string) {
    if (!confirm("Delete this post permanently? This also removes its comments and reactions.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Failed to delete post");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <h1 className="text-[40px] font-bold leading-tight tracking-tight text-[#1d1d1f]">
        Moderation
      </h1>
      <p className="mb-8 mt-2 text-[17px] text-[#6e6e73]">
        Recent posts across the social feed.
      </p>

      <div className="mb-6 flex items-center gap-2 rounded-[10px] bg-black/[0.04] px-3.5 py-2.5">
        <svg className="h-4 w-4 text-[#86868b]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx={11} cy={11} r={7} />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts by content"
          className="w-full bg-transparent text-[15px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
        />
      </div>

      {loading && posts.length === 0 ? (
        <div className="text-[15px] text-[#86868b]">Loading posts…</div>
      ) : error ? (
        <div className="text-[15px] text-[#d70015]">Failed to load posts. Admin access required.</div>
      ) : posts.length === 0 ? (
        <div className="text-[15px] text-[#86868b]">No posts found.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-start gap-3.5">
                {p.author.image ? (
                   
                  <img src={p.author.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-[12px] font-bold text-[#6e6e73]">
                    {(p.author.name || p.author.username || "?").slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14.5px] font-semibold tracking-tight text-[#1d1d1f]">
                      {p.author.name || p.author.username || "Unknown"}
                    </span>
                    {p.author.username && (
                      <span className="text-[12.5px] text-[#86868b]">@{p.author.username}</span>
                    )}
                    <span className="text-[12.5px] text-[#86868b]">· {timeAgo(p.createdAt)}</span>
                    {p.author.role === "BANNED" && (
                      <span className="rounded-full bg-[#ffeced] px-2 py-0.5 text-[11.5px] font-semibold text-[#d70015]">
                        Banned
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#1d1d1f]">
                    {p.content}
                  </p>
                  {p.media.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {p.media.slice(0, 4).map((m) => (
                         
                        <img
                          key={m.id}
                          src={m.thumbUrl || m.url}
                          alt=""
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ))}
                      {p.media.length > 4 && (
                        <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-black/5 text-[13px] font-medium text-[#6e6e73]">
                          +{p.media.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 text-[13px] text-[#86868b]">
                    {p._count.reactions} reactions · {p._count.comments} comments · {p.media.length} media
                  </div>
                </div>
                <button
                  onClick={() => removePost(p.id)}
                  disabled={busyId === p.id}
                  aria-label="Delete post"
                  className="shrink-0 rounded-full bg-[#ff3b30]/[0.08] px-4 py-1.5 text-[13px] font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/[0.15] disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cursor && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(query, cursor, true)}
            className="rounded-full bg-[#0071e3]/10 px-6 py-2 text-[14px] font-medium text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.16]"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
