"use client";


import { toast } from "@/components/ui/toast";
import { useState } from "react";
import Image from "next/image";
import { Avatar } from "./Avatar";
import { uploadFile, useAuthSocket } from "@/lib/social";
import { useSession } from "@/lib/session-client";
import { apiFetch } from "@/lib/apiFetch";
import { useHandleApiError } from "@/lib/useHandleApiError";
import { useTranslations } from "next-intl";
import { canAddMedia, type PostMediaInput } from "@/lib/post-media";

type MediaInput = PostMediaInput;

export function Composer({
  onPosted,
  groupId,
  pageId,
}: {
  onPosted: (post: unknown) => void;
  groupId?: string;
  pageId?: string;
}) {
  const { data: session } = useSession();
  const socketRef = useAuthSocket(session?.user?.id);
  const _handleApiError = useHandleApiError();
  const t = useTranslations("social");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (!canAddMedia(media, selected)) {
      toast.error(t("mediaLimit"));
      return;
    }

    setUploading(true);
    try {
      const uploaded: MediaInput[] = [];
      for (const file of selected) {
        const { url } = await uploadFile(file);
        uploaded.push({ url, kind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE" });
      }
      setMedia((prev) => {
        const combined = [...prev, ...uploaded];
        const videos = combined.filter((m) => m.kind === "VIDEO");
        if (videos.length > 1 || (videos.length === 1 && combined.length > 1)) {
          toast.error(t("mediaLimit"));
          return prev;
        }
        return combined.slice(0, 8);
      });
    } catch (err) {
      await _handleApiError(err, "attach a photo or video");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!content.trim() && media.length === 0) return;
    setPosting(true);
    const endpoint = pageId
      ? `/api/pages/${pageId}/posts`
      : groupId
        ? `/api/groups/${groupId}/posts`
        : "/api/posts";
    try {
      const post = await apiFetch(endpoint, {
        method: "POST",
        body: { content: content.trim(), media },
      });
      onPosted(post);
      setContent("");
      setMedia([]);
    } catch (err) {
      const { retryResult } = await _handleApiError(err, "publish your post", false, true, () =>
        apiFetch(endpoint, { method: "POST", body: { content: content.trim(), media } }),
      );
      if (retryResult) {
        onPosted(retryResult);
        setContent("");
        setMedia([]);
      }
    }
    setPosting(false);
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-sm p-4">
      <div className="flex gap-3">
        <Avatar user={{ name: session?.user?.name, image: (session?.user as { image?: string })?.image }} size={44} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("composerPlaceholder")}
          rows={2}
          className="flex-1 resize-none bg-[var(--surface-2)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
        />
      </div>

      {media.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap pl-14">
          {media.map((m, i) => (
            <span key={i} className="relative">
              {m.kind === "IMAGE" ? (
                <Image src={m.url} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <video src={m.url} className="h-16 w-16 rounded-lg object-cover bg-black" />
              )}
              <button
                onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <label className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gold-600 font-medium flex items-center gap-1.5">
          <input
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          📷 {uploading ? t("uploading") : t("photoVideo")}
        </label>
        <button
          onClick={submit}
          disabled={posting || uploading || (!content.trim() && media.length === 0)}
          className="bg-gold-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-gold-700 disabled:opacity-40 transition-colors"
        >
          {posting ? t("posting") : t("post")}
        </button>
      </div>
    </div>
  );
}
