"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "@/components/social/Avatar";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Store,
  Bookmark,
  Briefcase,
  Palette,
  MessageCircle,
  Image as ImageIcon,
  LogOut,
  ChevronRight,
} from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  theme?: string | null;
  autoReplyEnabled?: boolean;
  autoReplyText?: string | null;
  createdAt: string;
  _count: { posts: number; followers: number; following: number };
};

type Order = {
  id: string;
  status: string;
  total: string | number;
  createdAt: string;
  items: { id: string; quantity: number; product: { id: string; name: string; images: string[] } }[];
};

type SavedPost = {
  id: string;
  content?: string | null;
  createdAt: string;
  author: { id: string; name: string | null; username: string | null; image: string | null };
};

type Resume = { id: string; title: string; updatedAt: string };

type Application = {
  id: string;
  status: string;
  createdAt: string;
  job: { id: string; title: string; company?: string | null };
};

type SellerData = { count: number; maxProducts: number; accountType: string };

const THEMES = [
  { key: "gold", label: "Gold", color: "#ff6b5e" },
  { key: "emerald", label: "Emerald", color: "#10b981" },
  { key: "ocean", label: "Ocean", color: "#0ea5e9" },
  { key: "violet", label: "Violet", color: "#8b5cf6" },
  { key: "rose", label: "Rose", color: "#f43f5e" },
  { key: "slate", label: "Slate", color: "#64748b" },
];

type SectionId =
  | "overview"
  | "buying"
  | "social"
  | "market"
  | "collections"
  | "jobs"
  | "themes"
  | "chat"
  | "background";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  SHIPPED: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function AccountDashboard() {
  const t = useTranslations("account");
  const { data: session, status, signOut } = useSession();
  const [section, setSection] = useState<SectionId>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [saved, setSaved] = useState<SavedPost[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTheme, setSavingTheme] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyText, setAutoReplyText] = useState("");
  const [chatSaved, setChatSaved] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" && status !== "unauthenticated") return;
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    const uid = session.user.id;
    Promise.all([
      fetch(`/api/profiles/${uid}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/orders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/seller/products").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/posts/bookmarks?limit=5")
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => d.items ?? []),
      fetch("/api/resumes").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/jobs/my-applications").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, o, s, b, r, a]) => {
        if (p?.id) {
          setProfile(p);
          setAutoReplyEnabled(Boolean(p.autoReplyEnabled));
          setAutoReplyText(p.autoReplyText ?? "");
        }
        setOrders(Array.isArray(o) ? o : []);
        if (s?.products) setSeller({ count: s.count, maxProducts: s.maxProducts, accountType: s.accountType });
        setSaved(Array.isArray(b) ? b : []);
        setResumes(Array.isArray(r) ? r : []);
        setApplications(Array.isArray(a) ? a : []);
      })
      .finally(() => setLoading(false));
  }, [status, session?.user?.id]);

  const pickTheme = useCallback(
    async (theme: string) => {
      if (savingTheme) return;
      setSavingTheme(true);
      try {
        const res = await fetch("/api/profiles/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme }),
        });
        if (!res.ok) throw new Error("Could not save theme");
        setProfile((p) => (p ? { ...p, theme } : p));
        toast.success(t("themeSaved"));
      } catch {
        toast.error(t("themeFailed"));
      } finally {
        setSavingTheme(false);
      }
    },
    [savingTheme, t]
  );

  const saveChatSettings = useCallback(async () => {
    const res = await fetch("/api/profiles/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoReplyEnabled,
        autoReplyText: autoReplyText.trim() || undefined,
      }),
    });
    if (!res.ok) {
      toast.error(t("chatSaveFailed"));
      return;
    }
    setChatSaved(true);
    toast.success(t("chatSaved"));
  }, [autoReplyEnabled, autoReplyText, t]);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-[var(--surface-2)] animate-pulse rounded-lg mb-6" />
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          <div className="hidden lg:block space-y-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--surface-2)] animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-[var(--surface-2)] animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{t("signInRequired")}</p>
        <Link href="/login" className="rounded-full bg-gradient-to-br from-gold-500 to-gold-600 text-white px-6 py-2.5 font-semibold hover:brightness-110 transition">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const theme = profile?.theme || "gold";
  const activeCount = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  const profileUser = profile ?? { name: session.user.name ?? undefined };

  const navItems: { id: SectionId; label: string; Icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: t("navOverview"), Icon: LayoutDashboard },
    { id: "buying", label: t("navBuying"), Icon: ShoppingCart },
    { id: "social", label: t("navSocial"), Icon: Users },
    { id: "market", label: t("navMarket"), Icon: Store },
    { id: "collections", label: t("navCollections"), Icon: Bookmark },
    { id: "jobs", label: t("navJobs"), Icon: Briefcase },
    { id: "themes", label: t("navThemes"), Icon: Palette },
    { id: "chat", label: t("navChat"), Icon: MessageCircle },
    { id: "background", label: t("navBackground"), Icon: ImageIcon },
  ];

  return (
    <div className={`theme-${theme}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut size={15} />
            {t("logout")}
          </button>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 lg:sticky lg:top-20">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  section === id
                    ? "bg-gold-500/10 text-gold-600 dark:text-gold-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="min-w-0 space-y-5">
            {section === "overview" && (
              <>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6">
                  <div className="flex items-center gap-4">
                    <Avatar user={profileUser} size={64} />
                    <div>
                      <h2 className="text-lg font-bold">{profile?.name || t("welcome")}</h2>
                      {profile?.username && <p className="text-sm text-gray-400">@{profile.username}</p>}
                      <Link href={`/profile/${session.user.id}`} className="text-sm text-gold-600 hover:underline">
                        {t("viewProfile")}
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard label={t("statOrders")} value={orders.length} />
                  <StatCard label={t("statActiveOrders")} value={activeCount} />
                  <StatCard label={t("statFollowers")} value={profile?._count?.followers ?? 0} />
                  <StatCard label={t("statFollowing")} value={profile?._count?.following ?? 0} />
                  <StatCard label={t("statPosts")} value={profile?._count?.posts ?? 0} />
                  <StatCard label={t("statSaved")} value={saved.length} />
                  {seller && (
                    <StatCard
                      label={t("statProducts")}
                      value={`${seller.count}/${seller.maxProducts}`}
                    />
                  )}
                  <StatCard label={t("statResumes")} value={resumes.length} />
                  <StatCard label={t("statApplications")} value={applications.length} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <QuickLink href="/orders" label={t("qlOrders")} Icon={ShoppingCart} />
                  <QuickLink href="/saved" label={t("qlSaved")} Icon={Bookmark} />
                  <QuickLink href="/community/resume" label={t("qlResume")} Icon={Briefcase} />
                  <QuickLink href="/seller/dashboard" label={t("qlSeller")} Icon={Store} />
                  <QuickLink href={`/profile/${session.user.id}`} label={t("qlProfile")} Icon={Users} />
                  <QuickLink href="/messages" label={t("qlMessages")} Icon={MessageCircle} />
                </div>
              </>
            )}

            {section === "buying" && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
                <SectionHeader title={t("navBuying")} linkHref="/orders" linkLabel={t("viewAll")} />
                {orders.length === 0 ? (
                  <Empty text={t("emptyOrders")} />
                ) : (
                  orders.slice(0, 8).map((order) => (
                    <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {order.items.map((i) => i.product.name).join(", ") || t("orderPlaceholder")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()} · {order.items.reduce((n, i) => n + i.quantity, 0)} {t("items")}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}>
                        {order.status}
                      </span>
                      <span className="text-sm font-bold">${Number(order.total).toFixed(2)}</span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </Link>
                  ))
                )}
              </div>
            )}

            {section === "social" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                  <SectionHeader title={t("navSocial")} linkHref={`/profile/${session.user.id}`} linkLabel={t("viewProfile")} />
                  <div className="flex items-center gap-3 mt-3">
                    <Avatar user={profileUser} size={48} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{profile?.name || profile?.username || "—"}</p>
                      <p className="text-xs text-gray-400">
                        {profile?._count?.posts ?? 0} {t("statPosts")} · {profile?._count?.followers ?? 0} {t("statFollowers")} · {profile?._count?.following ?? 0} {t("statFollowing")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <PillLink href="/feed" label={t("qlFeed")} />
                    <PillLink href={`/profile/${session.user.id}`} label={t("qlProfile")} />
                    <PillLink href="/profile/edit" label={t("qlEditProfile")} />
                    <PillLink href="/saved" label={t("qlSaved")} />
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
                  <SectionHeader title={t("recentSaved")} linkHref="/saved" linkLabel={t("viewAll")} />
                  {saved.length === 0 ? (
                    <Empty text={t("emptySaved")} />
                  ) : (
                    saved.slice(0, 5).map((post) => (
                      <div key={post.id} className="p-4 flex items-center gap-3">
                        <Avatar user={post.author} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {post.author?.name || post.author?.username || "Someone"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{post.content || "—"}</p>
                        </div>
                        <Link href={`/profile/${post.author?.id}`} className="text-xs text-gold-600 hover:underline shrink-0">
                          {t("viewAuthor")}
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {section === "market" && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                <SectionHeader title={t("navMarket")} linkHref="/seller/dashboard" linkLabel={t("sellerDashboard")} />
                {seller ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                      <StatCard label={t("statProducts")} value={`${seller.count}/${seller.maxProducts}`} />
                      <StatCard label={t("sellerType")} value={seller.accountType} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{t("sellerHint")}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <PillLink href="/seller/products" label={t("inventory")} />
                      <PillLink href="/seller/products/new" label={t("addProduct")} />
                      <PillLink href="/seller/orders" label={t("sellerOrders")} />
                      <PillLink href={`/seller/shop/${session.user.id}`} label={t("myShop")} />
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t("notSeller")}</p>
                    <Link href="/seller/apply" className="inline-block rounded-full bg-gradient-to-br from-gold-500 to-gold-600 text-white px-5 py-2 text-sm font-semibold hover:brightness-110 transition">
                      {t("becomeSeller")}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {section === "collections" && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
                <SectionHeader title={t("navCollections")} linkHref="/saved" linkLabel={t("viewAll")} />
                {saved.length === 0 ? (
                  <Empty text={t("emptySaved")} />
                ) : (
                  saved.map((post) => (
                    <div key={post.id} className="p-4 flex items-center gap-3">
                      <Avatar user={post.author} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {post.author?.name || post.author?.username || "Someone"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{post.content || "—"}</p>
                      </div>
                      <Link href={`/feed`} className="text-xs text-gold-600 hover:underline shrink-0">
                        {t("openFeed")}
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}

            {section === "jobs" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
                  <SectionHeader title={t("navJobs")} linkHref="/jobs" linkLabel={t("browseJobs")} />
                  {applications.length === 0 ? (
                    <Empty text={t("emptyApplications")} />
                  ) : (
                    applications.slice(0, 6).map((app) => (
                      <Link key={app.id} href={`/jobs/${app.job.id}`} className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{app.job.title}</p>
                          <p className="text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[app.status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}>
                          {app.status}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                  <SectionHeader title={t("resumes")} linkHref="/community/resume" linkLabel={t("buildResume")} />
                  {resumes.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">{t("emptyResumes")}</p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {resumes.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3">
                          <span className="text-sm font-medium truncate">{r.title}</span>
                          <span className="text-xs text-gray-400 shrink-0 ml-3">{new Date(r.updatedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <PillLink href="/jobs/my-applications" label={t("myApplications")} />
                    <PillLink href="/jobs" label={t("browseJobs")} />
                  </div>
                </div>
              </div>
            )}

            {section === "themes" && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                <SectionHeader title={t("navThemes")} />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("themeHint")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                  {THEMES.map((th) => (
                    <button
                      key={th.key}
                      onClick={() => pickTheme(th.key)}
                      disabled={savingTheme}
                      className={`rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-60 ${
                        theme === th.key
                          ? "border-gold-500 shadow-md"
                          : "border-[var(--border-subtle)] hover:border-gold-300"
                      }`}
                    >
                      <span className="flex gap-1.5 mb-2">
                        <span className="h-6 w-6 rounded-full" style={{ backgroundColor: th.color }} />
                        <span className="h-6 w-6 rounded-full opacity-40" style={{ backgroundColor: th.color }} />
                        <span className="h-6 w-6 rounded-full opacity-20" style={{ backgroundColor: th.color }} />
                      </span>
                      <span className="block text-sm font-semibold">{t(`theme${th.key.charAt(0).toUpperCase()}${th.key.slice(1)}`)}</span>
                      {theme === th.key && (
                        <span className="mt-1 inline-block rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {t("active")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {section === "chat" && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                <SectionHeader title={t("navChat")} linkHref="/messages" linkLabel={t("openMessages")} />
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--surface-2)] p-4">
                    <div>
                      <p className="font-semibold text-sm">{t("autoReply")}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("autoReplyHint")}</p>
                    </div>
                    <button
                      onClick={() => setAutoReplyEnabled((v) => !v)}
                      aria-checked={autoReplyEnabled}
                      role="switch"
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        autoReplyEnabled ? "bg-gold-600" : "bg-gray-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          autoReplyEnabled ? "left-[1.4rem]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">{t("autoReplyText")}</label>
                    <textarea
                      value={autoReplyText}
                      onChange={(e) => {
                        setAutoReplyText(e.target.value);
                        setChatSaved(false);
                      }}
                      rows={3}
                      maxLength={500}
                      placeholder={t("autoReplyPlaceholder")}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveChatSettings}
                      className="rounded-full bg-gradient-to-br from-gold-500 to-gold-600 text-white px-5 py-2 text-sm font-semibold hover:brightness-110 transition"
                    >
                      {t("saveChat")}
                    </button>
                    {chatSaved && <span className="text-xs text-emerald-600">{t("chatSaved")}</span>}
                  </div>
                </div>
              </div>
            )}

            {section === "background" && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                <SectionHeader title={t("navBackground")} />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("backgroundHint")}</p>
                <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
                  {profile?.coverImage ? (
                    <Image src={profile.coverImage} alt="" width={1200} height={400} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="h-44 bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-white font-semibold">
                      {t("noCover")}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Avatar user={profileUser} size={48} />
                  <div>
                    <p className="text-sm font-semibold">{profile?.name || profile?.username || "—"}</p>
                    <p className="text-xs text-gray-400">{t("backgroundPreview")}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PillLink href="/profile/edit" label={t("editCover")} />
                  <PillLink href={`/profile/${session.user.id}`} label={t("viewProfile")} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, linkHref, linkLabel }: { title: string; linkHref?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <h2 className="font-bold">{title}</h2>
      {linkHref && linkLabel && (
        <Link href={linkHref} className="text-sm text-gold-600 hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <p className="text-xl font-bold text-gold-600 dark:text-gold-300">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function QuickLink({ href, label, Icon }: { href: string; label: string; Icon: typeof LayoutDashboard }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm font-medium hover:border-gold-300 hover:bg-gold-50/40 dark:hover:bg-gold-950/20 transition-colors">
      <Icon size={16} className="text-gold-600 dark:text-gold-300" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function PillLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-1.5 text-sm font-medium hover:border-gold-300 hover:text-gold-600 dark:hover:text-gold-300 transition-colors">
      {label}
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-gray-400 py-10 text-sm">{text}</p>;
}