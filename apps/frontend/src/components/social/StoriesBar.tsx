"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Avatar } from "./Avatar";
import { uploadFile } from "@/lib/social";
import { useSession } from "next-auth/react";

type Story = {
  id: string;
  mediaUrl: string;
  mediaKind: "IMAGE" | "VIDEO";
  caption: string | null;
  createdAt: string;
  viewed: boolean;
};

type StoryGroup = {
  author: { id: string; name: string | null; username: string | null; image: string | null };
  stories: Story[];
  allViewed: boolean;
};

export function StoriesBar() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewing, setViewing] = useState<{ group: number; story: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/stories")
      .then((r) => r.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function createStory(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl: url,
          mediaKind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        }),
      });
      const res = await fetch("/api/stories");
      if (res.ok) setGroups(await res.json());
    } catch {
      alert("Could not add your story.");
    }
    setUploading(false);
  }

  function openViewer(groupIndex: number) {
    setViewing({ group: groupIndex, story: 0 });
    markViewed(groups[groupIndex].stories[0].id);
  }

  function advance() {
    if (!viewing) return;
    const group = groups[viewing.group];
    if (viewing.story + 1 < group.stories.length) {
      const next = { ...viewing, story: viewing.story + 1 };
      setViewing(next);
      markViewed(group.stories[next.story].id);
    } else if (viewing.group + 1 < groups.length) {
      const next = { group: viewing.group + 1, story: 0 };
      setViewing(next);
      markViewed(groups[next.group].stories[0].id);
    } else {
      setViewing(null);
    }
  }

  function rewind() {
    if (!viewing) return;
    if (viewing.story > 0) {
      setViewing({ ...viewing, story: viewing.story - 1 });
    } else if (viewing.group > 0) {
      setViewing({ group: viewing.group - 1, story: 0 });
    }
  }

  function markViewed(storyId: string) {
    fetch(`/api/stories/${storyId}/view`, { method: "POST" }).catch(() => {});
  }

  const current = viewing ? groups[viewing.group] : null;
  const currentStory = current?.stories[viewing!.story];

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center gap-1 shrink-0 w-16"
        >
          <span className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-indigo-500 text-xl bg-[var(--surface)]">
            {uploading ? "…" : "＋"}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">Your story</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => createStory(e.target.files)}
        />
        {groups.map((group, gi) => (
          <button
            key={group.author.id}
            onClick={() => openViewer(gi)}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
          >
            <span
              className={`p-[2px] rounded-full ${
                group.allViewed
                  ? "bg-gray-200"
                  : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-indigo-500"
              }`}
            >
              <span className="block p-[2px] bg-[var(--surface)] rounded-full">
                <Avatar user={group.author} size={48} />
              </span>
            </span>
            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate w-full text-center">
              {group.author.id === session?.user?.id
                ? "You"
                : group.author.name || group.author.username}
            </span>
          </button>
        ))}
      </div>

      {current && currentStory && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setViewing(null)}
        >
          <button
            onClick={() => setViewing(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10"
          >
            ×
          </button>
          <button
            onClick={rewind}
            className="absolute left-0 top-0 bottom-0 w-1/4 cursor-w-resize"
            aria-label="Previous"
          />
          <button
            onClick={advance}
            className="absolute right-0 top-0 bottom-0 w-1/4 cursor-e-resize"
            aria-label="Next"
          />
          <div className="max-w-md w-full px-4">
            <div className="flex gap-1 mb-3">
              {current.stories.map((_, i) => (
                <span
                  key={i}
                  className={`h-0.5 flex-1 rounded ${i <= viewing!.story ? "bg-[var(--surface)]" : "bg-white/30"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Avatar user={current.author} size={32} />
              <span className="text-white text-sm font-medium">
                {current.author.name || current.author.username}
              </span>
            </div>
            {currentStory.mediaKind === "IMAGE" ? (
              <Image src={currentStory.mediaUrl} alt="" width={800} height={600} className="max-h-[70vh] w-full object-contain rounded-xl" />
            ) : (
              <video
                src={currentStory.mediaUrl}
                autoPlay
                controls
                onEnded={advance}
                className="max-h-[70vh] w-full rounded-xl"
              />
            )}
            {currentStory.caption && (
              <p className="text-white/90 text-sm mt-3 text-center">{currentStory.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
