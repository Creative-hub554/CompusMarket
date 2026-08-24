"use client";


import { toast } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/social/Avatar";
import { uploadFile } from "@/lib/social";

type Me = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
};

export default function EditProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    // profiles/me is PATCH-only; fetch full profile via session id
    fetch(`/api/profiles/${session?.user?.id}`)
      .then((r) => r.json())
      .then((p) => {
        if (!p?.id) return;
        setMe(p);
        setName(p.name ?? "");
        setUsername(p.username ?? "");
        setBio(p.bio ?? "");
      })
      .catch(() => {});
  }, [status, session?.user?.id]);

  async function save() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username: username || undefined,
          bio,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not save profile");
      }
      await update();
      router.push(`/profile/${session?.user?.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    }
    setSaving(false);
  }

  async function pickImage(kind: "image" | "coverImage", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [kind]: url }),
      });
      if (res.ok) {
        setMe((prev) => (prev ? { ...prev, [kind]: url } : prev));
        await update();
      }
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
            <span className="flex items-center justify-center w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-medium group-hover:opacity-90">
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
            className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Username</label>
          <div className="flex items-center border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
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
            className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
