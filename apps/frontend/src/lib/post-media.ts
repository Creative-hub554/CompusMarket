export type PostMediaInput = { url: string; kind: "IMAGE" | "VIDEO" };
export type UploadFileLike = { type: string };

export function canAddMedia(existing: PostMediaInput[], selected: UploadFileLike[]): boolean {
  const videos = selected.filter((file) => file.type.startsWith("video/")).length;
  const images = selected.filter((file) => file.type.startsWith("image/")).length;
  const unsupported = selected.length - videos - images;
  const hasVideo = existing.some((item) => item.kind === "VIDEO");

  return unsupported === 0 && videos <= 1 && !hasVideo &&
    (videos === 0
      ? existing.length + images <= 8
      : existing.length === 0 && selected.length === 1);
}
