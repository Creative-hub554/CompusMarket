"use client";


import { toast } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { Avatar } from "@/components/social/Avatar";
import { uploadFile } from "@/lib/social";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/apiFetch";

type Album = {
  id: string;
  title: string;
  description: string | null;
  images: { id: string; url: string; position: number }[];
};

type Me = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  accountPrivate?: boolean;
};

export default function EditProfilePage() {
  const t = useTranslations("profile");
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [accountPrivate, setAccountPrivate] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumSaving, setAlbumSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    // profiles/me is PATCH-only; fetch full profile via session id
    apiFetch<Me>(`/api/profiles/${session?.user?.id}`)
      .then((p) => {
        if (!p?.id) return;
        setMe(p);
        setName(p.name ?? "");
        setUsername(p.username ?? "");
        setBio(p.bio ?? "");
        setAccountPrivate(Boolean(p.accountPrivate));
        setAlbums(Array.isArray(p.albums) ? p.albums : []);
      })
      .catch(() => {});
  }, [status, session?.user?.id]);

  async function createAlbum() {
    if (!albumTitle.trim() || albumSaving) return;
    setAlbumSaving(true);
    try {
      const res = await fetch("/api/profiles/me/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: albumTitle.trim(), description: albumDescription.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Could not create album");
      const album = await res.json();
      setAlbums((current) => [album, ...current]);
      setAlbumTitle("");
      setAlbumDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create album");
    } finally {
      setAlbumSaving(false);
    }
  }

  async function deleteAlbum(albumId: string, title: string) {
    if (!window.confirm(`${t("deleteAlbumConfirm")} "${title}"`)) return;
    try {
      const res = await fetch(`/api/profiles/me/albums/${albumId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("deleteAlbumFailed"));
      setAlbums((current) => current.filter((album) => album.id !== albumId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("deleteAlbumFailed"));
    }
  }

  async function addAlbumImage(albumId: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      const res = await fetch(`/api/profiles/me/albums/${albumId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Could not add picture to album");
      const image = await res.json();
      setAlbums((current) => current.map((album) => album.id === albumId ? { ...album, images: [...album.images, image] } : album));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      await apiFetch("/api/profiles/me", {
        method: "PATCH",
        body: {
          name,
          username: username || undefined,
          bio,
          accountPrivate,
        },
      });
      await update();
      router.push(`/profile/${session?.user?.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function pickImage(kind: "image" | "coverImage", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      await apiFetch("/api/profiles/me", {
        method: "PATCH",
        body: { [kind]: url },
      });
      setMe((prev) => (prev ? { ...prev, [kind]: url } : prev));
      await update();
    } catch {
      toast.error("Upload failed. Is storage running?");
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <Link href="/login" className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Edit profile</h1>

      <div className="relative mb-12">
        <label className="block h-36 rounded-2xl overflow-hidden cursor-pointer group">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage("coverImage", e.target.files)}
          />
          {me?.coverImage ? (
            <Image src={me.coverImage} alt="" width={1200} height={400} unoptimized className="w-full h-full object-cover group-hover:opacity-90" />
          ) : (
            <span className="flex items-center justify-center w-full h-full bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 text-white text-sm font-medium group-hover:opacity-90">
              Change cover photo
            </span>
          )}
        </label>
        <label className="absolute -bottom-9 left-4 cursor-pointer ring-4 ring-white rounded-full inline-block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage("image", e.target.files)}
          />
          <Avatar user={me ?? {}} size={72} />
          <span className="absolute inset-0 rounded-full bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
            Change
          </span>
        </label>
      </div>

      <div className="space-y-4 mt-6">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Username</label>
          <div className="flex items-center border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-gold-300">
            <span className="text-gray-400 mr-1">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              maxLength={24}
              placeholder="optional handle"
              className="flex-1 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Tell the community about yourself…"
            className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("privateAccount")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("privateAccountHint")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={accountPrivate}
            aria-label={t("privateAccount")}
            onClick={() => setAccountPrivate((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold-300 ${
              accountPrivate ? "bg-gold-600" : "bg-gray-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                accountPrivate ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <section className="mt-8 border-t border-[var(--border-subtle)] pt-6">
          <h2 className="text-lg font-bold">{t("albums")}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t("albumsHint")}</p>
          <div className="mt-4 space-y-3">
            <input
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
              maxLength={80}
              placeholder={t("albumTitlePlaceholder")}
              className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2"
            />
            <input
              value={albumDescription}
              onChange={(e) => setAlbumDescription(e.target.value)}
              maxLength={300}
              placeholder={t("albumDescriptionPlaceholder")}
              className="w-full rounded-xl border border-[var(--border-subtle)] px-3 py-2"
            />
            <button type="button" onClick={createAlbum} disabled={!albumTitle.trim() || albumSaving} className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {albumSaving ? t("creatingAlbum") : t("createAlbum")}
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {albums.map((album) => (
              <div key={album.id} className="rounded-xl border border-[var(--border-subtle)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div><h3 className="font-semibold">{album.title}</h3>{album.description && <p className="text-xs text-[var(--text-muted)]">{album.description}</p>}</div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold">
                      {t("addPicture")}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => addAlbumImage(album.id, e.target.files)} />
                    </label>
                    <button type="button" onClick={() => deleteAlbum(album.id, album.title)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">
                      {t("deleteAlbum")}
                    </button>
                  </div>
                </div>
                {album.images.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{album.images.map((image) => <Image key={image.id} src={image.url} alt="" width={120} height={90} unoptimized className="aspect-square w-full rounded-lg object-cover" />)}</div>}
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-gold-600 text-white rounded-xl py-3 font-semibold hover:bg-gold-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
