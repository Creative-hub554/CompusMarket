"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch } from "@/lib/apiFetch";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";
import { BadgeCheck, BarChart3, Trash2, UserMinus } from "lucide-react";
import { MiniBarChart, MultiLineChart } from "@/components/social/PageCharts";

type PageProfile = {
  id: string;
  name: string;
  username: string;
  category: string;
  description: string | null;
  image: string | null;
  phone: string | null;
  followerCount: number;
  verified: boolean;
  viewerRole: "OWNER" | "EDITOR" | null;
};

type Member = {
  id: string;
  userId: string;
  role: "OWNER" | "EDITOR";
  user: { id: string; name: string | null; username: string | null; image: string | null };
};

type Insights = {
  followers: number;
  newFollowers: number;
  impressions: number;
  reactions: number;
  comments: number;
  engagementScore: number;
  avgEngagementRate: number;
  topPosts: {
    id: string;
    content: string;
    reactions: number;
    comments: number;
    impressions: number;
    engagementRate: number;
    rank: number;
    createdAt: string;
  }[];
  followerGrowth: { date: string; count: number }[];
  engagementOverTime: {
    date: string;
    impressions: number;
    reactions: number;
    comments: number;
    posts: number;
  }[];
  postFrequency: { week: string; count: number }[];
};

export default function ManagePageRoute() {
  const t = useTranslations("pages");
  const router = useRouter();
  const { id: pageId } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const [page, setPage] = useState<PageProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [adding, setAdding] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const data = await apiFetch<PageProfile>(`/api/pages/${pageId}`);
      setPage(data);
      setName(data.name);
      setCategory(data.category);
      setDescription(data.description ?? "");
      setPhone(data.phone ?? "");
      apiFetch<Member[]>(`/api/pages/${pageId}/members`).then(setMembers).catch(() => undefined);
      apiFetch<Insights>(`/api/pages/${pageId}/insights`).then(setInsights).catch(() => undefined);
    } catch {
      setNotFound(true);
    }
  }, [pageId]);

  useEffect(() => {
    if (session?.user?.id) loadAll();
  }, [session?.user?.id, loadAll]);

  if (!session) {
    return <RequireAuth message={t("signInToManage")} />;
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{t("notFound")}</p>
        <Link href="/pages" className="btn-ghost mt-4 inline-block no-underline">
          {t("backToPages")}
        </Link>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-32 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (page.viewerRole === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{t("notStaff")}</p>
        <Link href={`/pages/${page.username}`} className="btn-ghost mt-4 inline-block no-underline">
          {t("backToPage")}
        </Link>
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/pages/${page!.id}`, {
        method: "PATCH",
        body: {
          name: name.trim(),
          category: category.trim(),
          description: description.trim() || null,
          phone: phone.trim() || null,
        },
      });
      toast.success(t("savedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionFailed"));
    }
    setSaving(false);
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const uname = addUsername.trim().replace(/^@/, "");
    if (!uname) return;
    setAdding(true);
    try {
      const user = await apiFetch<{ id: string }>(`/api/profiles/username/${uname}`);
      await apiFetch(`/api/pages/${page!.id}/members`, {
        method: "POST",
        body: { userId: user.id, role: "EDITOR" },
      });
      setAddUsername("");
      toast.success(t("memberAdded"));
      const fresh = await apiFetch<Member[]>(`/api/pages/${page!.id}/members`);
      setMembers(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionFailed"));
    }
    setAdding(false);
  }

  async function removeMember(userId: string) {
    if (!confirm(t("memberRemoveConfirm"))) return;
    try {
      await apiFetch(`/api/pages/${page!.id}/members/${userId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success(t("memberRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionFailed"));
    }
  }

  async function deletePage() {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await apiFetch(`/api/pages/${page!.id}`, { method: "DELETE" });
      toast.success(t("deletedToast"));
      router.push("/pages");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionFailed"));
    }
  }

  const isOwner = page.viewerRole === "OWNER";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title inline-flex items-center gap-2">
            {page.name}
            {page.verified && <BadgeCheck size={20} className="text-gold-500" />}
          </h1>
          <p className="page-subtitle">
            @{page.username} · {page.followerCount} {t("followers")}
          </p>
        </div>
        <Link href={`/pages/${page.username}`} className="btn-ghost shrink-0 no-underline">
          {t("viewPublic")}
        </Link>
      </div>

      {/* Analytics Dashboard */}
      <section className="card rounded-2xl p-5">
        <h2 className="font-bold mb-4 inline-flex items-center gap-2">
          <BarChart3 size={17} className="text-gold-500" />
          {t("insightsTitle")}
        </h2>
        {!insights ? (
          <div className="h-20 rounded-xl animate-shimmer" />
        ) : (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t("insFollowers"), value: insights.followers, sub: `+${insights.newFollowers} ${t("insNewFollowers")}` },
                { label: t("insImpressions"), value: insights.impressions, sub: null },
                { label: t("insEngagement"), value: insights.engagementScore, sub: null },
                { label: t("insEngagementRate"), value: `${insights.avgEngagementRate}%`, sub: null },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-[var(--surface-2)] p-3">
                  <p className="text-xl font-bold text-gold-600 dark:text-gold-400">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                  {s.sub && <p className="text-[10px] text-green-500 mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Follower growth chart (SVG bar chart) */}
            {insights.followerGrowth.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("insFollowerGrowth")}</h3>
                <div className="bg-[var(--surface-2)] rounded-xl p-3 overflow-x-auto">
                  <MiniBarChart
                    data={insights.followerGrowth.map((d) => ({ label: d.date.slice(5), value: d.count }))}
                    color="var(--color-gold-500, #f59e0b)"
                    height={80}
                  />
                </div>
              </div>
            )}

            {/* Engagement over time chart */}
            {insights.engagementOverTime.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("insEngagementOverTime")}</h3>
                <div className="bg-[var(--surface-2)] rounded-xl p-3 overflow-x-auto">
                  <MultiLineChart
                    data={insights.engagementOverTime.map((d) => ({
                      label: d.date.slice(5),
                      lines: [
                        { value: d.impressions, color: "#6366f1", label: t("insImpressions") },
                        { value: d.reactions, color: "#f59e0b", label: t("insReactions") },
                        { value: d.comments, color: "#10b981", label: t("insComments") },
                      ],
                    }))}
                    height={80}
                  />
                </div>
              </div>
            )}

            {/* Post frequency chart */}
            {insights.postFrequency.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("insPostFrequency")}</h3>
                <div className="bg-[var(--surface-2)] rounded-xl p-3 overflow-x-auto">
                  <MiniBarChart
                    data={insights.postFrequency.map((d) => ({ label: d.week.slice(5), value: d.count }))}
                    color="#10b981"
                    height={60}
                  />
                </div>
              </div>
            )}

            {/* Top posts ranking */}
            {insights.topPosts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t("insTopPosts")}</h3>
                <ul className="space-y-2">
                  {insights.topPosts.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 text-sm rounded-lg bg-[var(--surface-2)] p-2.5">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center text-xs font-bold">
                        #{p.rank}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-300">{p.content || t("mediaPost")}</span>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
                        <span>♥ {p.reactions}</span>
                        <span>💬 {p.comments}</span>
                        <span>👁 {p.impressions}</span>
                        <span className="font-medium text-gold-500">{p.engagementRate}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="card rounded-2xl p-5">
        <h2 className="font-bold mb-3">{t("settingsTitle")}</h2>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label htmlFor="m-name" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("name")}
            </label>
            <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required minLength={2} maxLength={80} />
          </div>
          <div>
            <label htmlFor="m-cat" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("category")}
            </label>
            <input id="m-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" required minLength={2} maxLength={60} />
          </div>
          <div>
            <label htmlFor="m-desc" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("description")}
            </label>
            <textarea id="m-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field resize-none" rows={2} maxLength={500} />
          </div>
          <div>
            <label htmlFor="m-phone" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
              {t("phone")}
            </label>
            <input id="m-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" maxLength={40} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </section>

      {/* Members */}
      <section className="card rounded-2xl p-5">
        <h2 className="font-bold mb-3">{t("membersTitle")}</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="flex-1 min-w-0 text-sm">
                <span className="font-semibold">{m.user.name || m.user.username}</span>{" "}
                <span className="text-xs text-slate-400">({m.role === "OWNER" ? t("roleOwner") : t("roleEditor")})</span>
              </span>
              {isOwner && m.role !== "OWNER" && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="btn-ghost !py-1 !px-2 text-red-500 inline-flex items-center gap-1"
                  aria-label={t("memberRemove")}
                >
                  <UserMinus size={14} /> {t("memberRemove")}
                </button>
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={addMember} className="flex gap-2 mt-3">
            <input
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              className="input-field flex-1"
              placeholder={t("memberAddPlaceholder")}
            />
            <button type="submit" disabled={adding || !addUsername.trim()} className="btn-primary shrink-0">
              {adding ? "…" : t("memberAdd")}
            </button>
          </form>
        )}
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section className="card rounded-2xl p-5 border-red-200 dark:border-red-900">
          <h2 className="font-bold mb-2 text-red-600 dark:text-red-400">{t("dangerTitle")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t("dangerText")}</p>
          <button onClick={deletePage} className="btn-ghost !text-red-600 dark:!text-red-400 inline-flex items-center gap-1.5">
            <Trash2 size={15} />
            {t("deletePage")}
          </button>
        </section>
      )}
    </div>
  );
}
