"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/session-client";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch } from "@/lib/apiFetch";
import { uploadFile } from "@/lib/social";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";

export default function NewPageForm() {
  const t = useTranslations("pages");
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"image" | "cover" | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <RequireAuth message={t("signInToCreate")} />;
  }

  async function pickImage(kind: "image" | "cover", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(kind);
    try {
      const { url } = await uploadFile(file);
      if (kind === "image") setImage(url);
      else setCoverImage(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("actionFailed"));
    }
    setUploading(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !category.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const page = await apiFetch<{ username: string }>("/api/pages", {
        method: "POST",
        body: {
          name: name.trim(),
          username: username.trim(),
          category: category.trim(),
          description: description.trim() || undefined,
          phone: phone.trim() || undefined,
          image: image || undefined,
          coverImage: coverImage || undefined,
        },
      });
      toast.success(t("createdToast"));
      router.push(`/pages/${page.username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 animate-fade-in">
      <h1 className="page-title">{t("createTitle")}</h1>
      <p className="page-subtitle mb-6">{t("createSubtitle")}</p>

      <form onSubmit={submit} className="card rounded-2xl p-5 space-y-4">
        {/* cover picker */}
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300" htmlFor="page-cover">
            {t("coverImage")}
          </label>
          <label
            htmlFor="page-cover"
            className="block h-28 rounded-xl border-2 border-dashed border-[var(--border-subtle)] bg-[var(--surface-2)] bg-cover bg-center cursor-pointer"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          >
            {!coverImage && (
              <span className="flex h-full items-center justify-center text-sm text-slate-400">
                {uploading === "cover" ? t("uploading") : t("addCover")}
              </span>
            )}
          </label>
          <input
            id="page-cover"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickImage("cover", e.target.files)}
          />
        </div>

        {/* avatar picker */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="page-avatar"
            className="shrink-0 h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-gold to-gold-light flex items-center justify-center font-bold text-white text-2xl cursor-pointer"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              (name.trim().charAt(0).toUpperCase() || "+")
            )}
          </label>
          <div>
            <label htmlFor="page-avatar" className="text-sm font-medium cursor-pointer">
              {uploading === "image" ? t("uploading") : t("chooseAvatar")}
            </label>
            <input
              id="page-avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickImage("image", e.target.files)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="page-name" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            {t("name")}
          </label>
          <input
            id="page-name"
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
          <label htmlFor="page-username" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            {t("username")}
          </label>
          <div className="flex items-center">
            <span className="text-slate-400 mr-1">@</span>
            <input
              id="page-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              className="input-field"
              placeholder={t("usernamePlaceholder")}
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]{3,24}"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("usernameHint")}</p>
        </div>

        <div>
          <label htmlFor="page-category" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            {t("category")}
          </label>
          <input
            id="page-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
            placeholder={t("categoryPlaceholder")}
            required
            minLength={2}
            maxLength={60}
            list="page-category-list"
          />
          <datalist id="page-category-list">
            {["Restaurant", "Shop", "Tailor", "Salon", "Repair", "School", "Grocery"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="page-desc" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            {t("description")}
          </label>
          <textarea
            id="page-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field resize-none"
            rows={2}
            maxLength={500}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>

        <div>
          <label htmlFor="page-phone" className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            {t("phone")}
          </label>
          <input
            id="page-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="+855 …"
            maxLength={40}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            {t("cancel")}
          </button>
          <button type="submit" disabled={creating || uploading !== null} className="btn-primary">
            {creating ? t("creating") : t("create")}
          </button>
        </div>
      </form>
    </div>
  );
}
