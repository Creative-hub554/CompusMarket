import { describe, expect, it } from "vitest";
import { canAddMedia, type PostMediaInput } from "@/lib/post-media";

type FileLike = { type: string };
const image = (): FileLike => ({ type: "image/jpeg" });
const video = (): FileLike => ({ type: "video/mp4" });
const existing = (kind: "IMAGE" | "VIDEO"): PostMediaInput[] => [{ url: "stored", kind }];

describe("canAddMedia", () => {
  it.each([
    ["one photo", [], [image()], true],
    ["eight photos", [], Array.from({ length: 8 }, image), true],
    ["ninth photo", Array.from({ length: 8 }, () => ({ url: "stored", kind: "IMAGE" as const })), [image()], false],
    ["one video", [], [video()], true],
    ["video with photo", [], [video(), image()], false],
    ["second video", existing("VIDEO"), [video()], false],
    ["unsupported file", [], [{ type: "text/plain" }], false],
  ])("%s", (_name, current, selected, expected) => {
    expect(canAddMedia(current, selected)).toBe(expected);
  });
});
