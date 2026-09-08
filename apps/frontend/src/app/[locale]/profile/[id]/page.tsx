"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "@/components/social/Avatar";
import { FollowButton } from "@/components/social/FollowButton";
import { PostCard, FeedPost } from "@/components/social/PostCard";
import { toast } from "@/components/ui/toast";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

type ProfileAlbum = {
  id: string;
  title: string;
  description: string | null;
  images: { id: string; url: string; position: number }[];
};

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  createdAt: string;
  isFollowing: boolean;
  accountPrivate?: boolean;
  theme?: string | null;
  followRequested?: boolean;
  albums: ProfileAlbum[];
  _count: { posts: number; followers: number; following: number };
};

type FollowRequest = {
  id: string;
  follower: { id: string; name: string | null; username: string | null; image: string | null };
};

type Person = { id: string; name: string | null; username: string | null; image: string | null };

type TabId = "posts" | "about" | "followers" | "following" | "albums" | "settings";

const TABS: TabId[] = ["posts", "about", "followers", "following", "albums"];

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [tab, setTab] = useState<TabId>("posts");
  const [followers, setFollowers] = useState<Person[] | null>(null);
  const [following, setFollowing] = useState<Person[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyBusy, setPrivacyBusy] = useState(false);

  const loadPosts = useCallback(async () => {
    // A private account the viewer does not follow answers 403; treat that
    // as an empty (locked) feed rather than showing stale or misleading posts.
    const res = await fetch(`/api/profiles/${id}/posts`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.items ?? []);
    } else {
      setPosts([]);
    }
  }, [id]);

  const loadFollowers = useCallback(async () => {
    const res = await fetch(`/api/users/${id}/followers`);
    if (!res.ok) return;
    const rows = await res.json();
    setFollowers(Array.isArray(rows) ? rows.map((r: { follower: Person }) => r.follower) : []);
  }, [id]);

  const loadFollowing = useCallback(async () => {
    const res = await fetch(`/api/users/${id}/following`);
    if (!res.ok) return;
    const rows = await res.json();
    setFollowing(Array.isArray(rows) ? rows.map((r: { following: Person }) => r.following) : []);
  }, [id]);

  // Fetch a tab's data the first time it is opened (Facebook-style lazy tabs).
  useEffect(() => {
    if (tab === "followers" && followers === null) loadFollowers();
    if (tab === "following" && following === null) loadFollowing();
  }, [tab, followers, following, loadFollowers, loadFollowing]);

  // Refresh after follow/unfollow: follow state decides what the visitor sees.
  const refresh = useCallback(async () => {
    const [p] = await Promise.all([
      fetch(`/api/profiles/${id}`).then((r) => (r.ok ? r.json() : null)),
      loadPosts(),
    ]);
    if (p) setProfile(p);
  }, [id, loadPosts]);

  useEffect(() => {
    if (status !== "authenticated" && status !== "unauthenticated") return;
    Promise.all([
      fetch(`/api/profiles/${id}`).then((r) => (r.ok ? r.json() : null)),
      loadPosts(),
    ])
      .then(async ([p]) => {
        setProfile(p);
        // Own profile: surface pending follow requests to approve or decline.
        if (p?.id && p.id === session?.user?.id) {
          const res = await fetch("/api/follow-requests");
          if (res.ok) {
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id, status, loadPosts, session?.user?.id]);

  if (loading || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-40 rounded-2xl bg-[var(--surface-2)] animate-pulse mb-16" />
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isMe = session?.user?.id === profile.id;
  // Private accounts only show posts to the account holder and their followers.
  const locked = Boolean(profile.accountPrivate) && !isMe && !profile.isFollowing;
  // The API zeroes the count for locked profiles; keep the UI honest even if
  // a stale payload slips through.
  const visiblePostCount = locked ? 0 : profile._count.posts;

  async function respondToRequest(requestId: string, accept: boolean) {
    const res = await fetch(`/api/follow-requests/${requestId}/${accept ? "accept" : "decline"}`, {
      method: "POST",
    });
    if (!res.ok) return;
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (accept) refresh(); // The new follower's count changed.
  }

  async function togglePrivacy() {
    if (privacyBusy) return;
    setPrivacyBusy(true);
    const next = !(profile?.accountPrivate ?? false);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountPrivate: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not update privacy");
      }
      setProfile((p) => (p ? { ...p, accountPrivate: next } : p));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update privacy");
    } finally {
      setPrivacyBusy(false);
    }
  }

  const tabCls = (active: boolean) =>
    `relative px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
      active
        ? "text-gold-600 dark:text-gold-300"
        : "text-slate-500 hover:bg-[var(--surface-2)] rounded-t-lg dark:text-slate-400"
    }`;

  const tabs: TabId[] = isMe ? [...TABS, "settings"] : TABS;

  return (
    <div className={`theme-${profile.theme || "gold"} max-w-2xl mx-auto px-4 py-8`}>
      <div className="relative mb-14">
        <div
          className={`h-44 rounded-2xl overflow-hidden ${
            profile.coverImage ? "" : "bg-gradient-to-r from-gold to-gold-light"
          }`}
        >
          {profile.coverImage && (
            <Image src={profile.coverImage} alt="" width={1200} height={400} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute -bottom-10 left-6 ring-4 ring-white rounded-full">
          <Avatar user={profile} size={88} />
        </div>
        <div className="absolute -bottom-8 right-6 flex gap-2">
          {isMe ? (
            <Link
              href="/profile/edit"
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
            >
              {t("editProfile")}
            </Link>
          ) : (
            <FollowButton
              userId={profile.id}
              initialFollowing={profile.isFollowing}
              initialRequested={Boolean(profile.followRequested)}
              onChange={refresh}
            />
          )}
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
        {profile.username && <p className="text-gray-400">@{profile.username}</p>}
        {profile.bio && <p className="mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{profile.bio}</p>}
        <div className="flex gap-5 mt-3 text-sm">
          <button onClick={() => setTab("posts")} className="hover:underline">
            <strong>{visiblePostCount}</strong> <span className="text-gray-500 dark:text-gray-400">{t("posts")}</span>
          </button>
          <button onClick={() => setTab("followers")} className="hover:underline">
            <strong>{profile._count.followers}</strong>{" "}
            <span className="text-gray-500 dark:text-gray-400">{t("followersTab")}</span>
          </button>
          <button onClick={() => setTab("following")} className="hover:underline">
            <strong>{profile._count.following}</strong>{" "}
            <span className="text-gray-500 dark:text-gray-400">{t("followingTab")}</span>
          </button>
          <span className="text-gray-400">{t("memberSince", { date: new Date(profile.createdAt).toLocaleDateString() })}</span>
        </div>
      </div>

      {isMe && requests.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[var(--border-subtle)] p-4">
          <h2 className="font-bold mb-3">{t("followRequests")}</h2>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar user={r.follower} size={40} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${r.follower.id}`}
                    className="text-sm font-semibold hover:underline block truncate"
                  >
                    {r.follower.name || r.follower.username || "Someone"}
                  </Link>
                  {r.follower.username && (
                    <p className="text-xs text-gray-400 truncate">@{r.follower.username}</p>
                  )}
                </div>
                <button
                  onClick={() => respondToRequest(r.id, true)}
                  className="rounded-full bg-gold-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-gold-700"
                >
                  {t("accept")}
                </button>
                <button
                  onClick={() => respondToRequest(r.id, false)}
                  className="rounded-full border border-gray-300 text-gray-700 dark:text-gray-300 px-4 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  {t("decline")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facebook-style tab bar */}
      <div className="mb-6 flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto">
        {tabs.map((tabId) => (
          <button key={tabId} onClick={() => setTab(tabId)} className={tabCls(tab === tabId)}>
            {tabId === "posts" && t("posts")}
            {tabId === "about" && t("about")}
            {tabId === "followers" && t("followersTab")}
            {tabId === "following" && t("followingTab")}
            {tabId === "albums" && t("albums")}
            {tabId === "settings" && t("settings")}
            {tab === tabId && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-gold-500 rounded-full" />}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <>
          {profile.image && (
            <figure className="mb-6 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
              <figcaption className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {t("highlightedPicture")}
              </figcaption>
              <Image
                src={profile.image}
                alt={profile.name || profile.username || t("profilePictureAlt")}
                width={1200}
                height={900}
                className="max-h-[28rem] w-full object-cover"
              />
            </figure>
          )}
          {locked ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 py-12 px-6 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-600">
                <Lock size={22} />
              </span>
              <h2 className="text-lg font-bold">{t("lockedTitle")}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("lockedText")}
              </p>
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No posts yet.</p>
          ) : (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={(pid) => setPosts((prev) => prev.filter((p) => p.id !== pid))}
                  onEdited={(updated) =>
                    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "about" && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 space-y-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{t("about")}</h2>
            <p className="text-slate-700 dark:text-slate-300">
              {profile.bio || "—"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-lg font-bold">{visiblePostCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("posts")}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-lg font-bold">{profile._count.followers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("followersTab")}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-lg font-bold">{profile._count.following}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("followingTab")}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("memberSince", { date: new Date(profile.createdAt).toLocaleDateString() })}
          </p>
        </div>
      )}

      {(tab === "followers" || tab === "following") && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
          {tab === "followers" && followers !== null && followers.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t("noFollowers")}</p>
          )}
          {tab === "following" && following !== null && following.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t("noFollowing")}</p>
          )}
          {(tab === "followers" ? followers : following)
            ?.filter((person): person is Person => Boolean(person))
            .map((person) => (
              <div key={person.id} className="flex items-center gap-3 p-3">
                <Link href={`/profile/${person.id}`}>
                  <Avatar user={person} size={44} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${person.id}`} className="text-sm font-semibold hover:underline block truncate">
                    {person.name || person.username}
                  </Link>
                  {person.username && <p className="text-xs text-gray-400 truncate">@{person.username}</p>}
                </div>
                {person.id !== session?.user?.id && (
                  <FollowButton userId={person.id} initialFollowing={false} size="sm" onChange={refresh} />
                )}
              </div>
            ))}
        </div>
      )}

      {tab === "albums" && (
        <div className="space-y-4">
          {profile.albums.length === 0 && (
            <p className="text-center text-gray-400 py-8">{t("emptyAlbum")}</p>
          )}
          {profile.albums.map((album) => (
            <article key={album.id} className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
              <h3 className="font-semibold">{album.title}</h3>
              {album.description && <p className="mt-1 text-sm text-[var(--text-muted)]">{album.description}</p>}
              {album.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {album.images.map((image) => (
                    <Image key={image.id} src={image.url} alt="" width={240} height={240} unoptimized className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">{t("emptyAlbum")}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "settings" && isMe && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 space-y-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t("accountSummary")}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">{t("nameLabel")}</dt>
                <dd className="font-medium truncate">{profile.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">{t("usernameLabel")}</dt>
                <dd className="font-medium truncate">{profile.username ? `@${profile.username}` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">{t("memberSinceLabel")}</dt>
                <dd className="font-medium">{new Date(profile.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--surface-2)] p-4">
            <div>
              <p className="font-semibold text-sm">{t("privacySection")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("privateAccountHint")}</p>
            </div>
            <button
              onClick={togglePrivacy}
              disabled={privacyBusy}
              aria-checked={Boolean(profile.accountPrivate)}
              role="switch"
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                profile.accountPrivate ? "bg-gold-600" : "bg-gray-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  profile.accountPrivate ? "left-[1.4rem]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <Link
            href="/profile/edit"
            className="block w-full rounded-full bg-gradient-to-br from-gold-500 to-gold-600 text-white py-2.5 text-center text-sm font-semibold hover:brightness-110 transition"
          >
            {t("editFullProfile")}
          </Link>
        </div>
      )}
    </div>
  );
}