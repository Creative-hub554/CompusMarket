"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Users, Plus, MessageSquare, Lock, Search } from "lucide-react";
import { toast } from "@/components/ui/toast";

type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  isCreator: boolean;
  privacy: "PUBLIC" | "PRIVATE";
  hasPendingRequest?: boolean;
};

export default function GroupsPage() {
  const t = useTranslations("groups");
  const { data: session } = useSession();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (cursor?: string, q?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    const res = await fetch(`/api/groups?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setGroups((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search) return;
    const handle = setTimeout(() => load(undefined, search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search, load]);

  async function toggleMembership(group: GroupSummary) {
    setBusyId(group.id);
    // Leaving a private group with a pending request cancels the request.
    const action =
      !group.isMember && group.hasPendingRequest ? "leave" : group.isMember ? "leave" : "join";
    const res = await fetch(`/api/groups/${group.id}/${action}`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.requested) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id ? { ...g, hasPendingRequest: true } : g
          )
        );
        toast.success(t("requestSentToast"));
      } else if (data.cancelled) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id ? { ...g, hasPendingRequest: false } : g
          )
        );
        toast.success(t("requestCancelledToast"));
      } else {
        const joined = data.joined as boolean;
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  isMember: joined,
                  memberCount: g.memberCount + (joined ? 1 : -1),
                }
              : g
          )
        );
        toast.success(joined ? t("joinedToast") : t("leftToast"));
      }
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || t("actionFailed"));
    }
    setBusyId(null);
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
        privacy,
      }),
    });
    if (res.ok) {
      const group = await res.json();
      setGroups((prev) => [group, ...prev]);
      setName("");
      setDescription("");
      setShowCreate(false);
      toast.success(t("createdToast"));
    } else {
      toast.error(t("actionFailed"));
    }
    setCreating(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </div>
        {session?.user && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="btn-primary inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} />
            {t("create")}
          </button>
        )}
      </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="input-field !rounded-full !pl-10"
          />
        </div>

      {showCreate && (
        <form
          onSubmit={createGroup}
          className="card rounded-2xl p-5 mb-6 space-y-3 animate-slide-down"
        >
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("name")}
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder={t("namePlaceholder")}
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="group-desc" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("description")}
            </label>
            <textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={2}
              maxLength={500}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div>
            <label htmlFor="group-privacy" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("privacy")}
            </label>
            <select
              id="group-privacy"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as "PUBLIC" | "PRIVATE")}
              className="input-field"
            >
              <option value="PUBLIC">{t("privacyPublic")}</option>
              <option value="PRIVATE">{t("privacyPrivate")}</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {privacy === "PRIVATE" ? t("privacyPrivateHint") : t("privacyPublicHint")}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">
              {t("cancel")}
            </button>
            <button type="submit" disabled={creating || !name.trim()} className="btn-primary">
              {creating ? t("creating") : t("create")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 card rounded-2xl">
          <Users size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t("empty")}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("emptyText")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="card rounded-2xl p-5 flex items-center gap-4"
            >
              <Link href={`/community/groups/${group.id}`} className="flex-1 min-w-0 no-underline">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 inline-flex items-center gap-1.5">
                  {group.name}
                  {group.privacy === "PRIVATE" && (
                    <Lock size={13} className="text-slate-400" aria-label={t("privacyPrivate")} />
                  )}
                </h2>
                {group.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {group.description}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Users size={13} /> {group.memberCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare size={13} /> {group.postCount}
                  </span>
                </p>
              </Link>
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={`/community/groups/${group.id}`}
                  className="btn-ghost !py-1.5 text-center no-underline"
                >
                  {t("open")}
                </Link>
                {session?.user && !group.isCreator && (
                  <button
                    onClick={() => toggleMembership(group)}
                    disabled={busyId === group.id}
                    className={
                      group.isMember
                        ? "btn-ghost"
                        : group.hasPendingRequest
                          ? "btn-ghost !text-indigo-600 dark:!text-indigo-400"
                          : "btn-primary !py-1.5"
                    }
                  >
                    {busyId === group.id
                      ? "…"
                      : group.isMember
                        ? t("leave")
                        : group.hasPendingRequest
                          ? t("requested")
                          : group.privacy === "PRIVATE"
                            ? t("requestToJoin")
                            : t("join")}
                  </button>
                )}
              </div>
            </div>
          ))}
          {nextCursor && (
            <div className="text-center pt-2">
              <button onClick={() => load(nextCursor, search.trim() || undefined)} className="btn-ghost">
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
