"use client";


import { toast } from "@/components/ui/toast";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/social/Avatar";
import { uploadFile } from "@/lib/social";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

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
        setAccountPrivate(Boolean(p.accountPrivate));
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
          accountPrivate,
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

  async function changePassword() {
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ kind: "error", text: "Password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ kind: "error", text: "Passwords do not match" });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordMessage({ kind: "error", text: body.error || "Could not change password" });
        return;
      }
      setPasswordMessage({ kind: "success", text: "Password changed. Other sessions have been signed out." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage({ kind: "error", text: "Something went wrong" });
    } finally {
      setChangingPassword(false);
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-gold-600 text-white rounded-xl py-3 font-semibold hover:bg-gold-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="mt-10 rounded-2xl border border-[var(--border-subtle)] p-6">
        <h2 className="text-lg font-bold mb-1">Change password</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Enter your current password, then a new one.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 pr-11 focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          {passwordMessage && (
            <p
              className={
                passwordMessage.kind === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-green-600"
              }
            >
              {passwordMessage.text}
            </p>
          )}
          <button
            onClick={changePassword}
            disabled={changingPassword}
            className="w-full bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-gold-700 disabled:opacity-50 transition-colors dark:bg-slate-100 dark:text-slate-900"
          >
            {changingPassword ? "Updating…" : "Update password"}
          </button>
        </div>
      </div>
    </div>
  );
}
