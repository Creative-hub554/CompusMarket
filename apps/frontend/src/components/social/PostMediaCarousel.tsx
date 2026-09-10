"use client";

import { useState } from "react";
import Image from "next/image";
import type { PostMediaInput } from "@/lib/post-media";

type Media = PostMediaInput & { id: string; thumbUrl?: string | null };

export function PostMediaCarousel({ media }: { media: Media[] }) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  if (!media.length) return null;
  if (media.length === 1) {
    const item = media[0];
    return <div className="mt-3 overflow-hidden rounded-xl">{item.kind === "IMAGE" ? <Image src={item.url} alt="" width={800} height={420} className="w-full max-h-[420px] object-cover" /> : <video src={item.url} controls className="w-full max-h-[420px] bg-black" />}</div>;
  }
  const activeIndex = Math.min(index, media.length - 1);
  const move = (delta: number) => setIndex((current) => Math.max(0, Math.min(media.length - 1, current + delta)));
  const selected = media[activeIndex];
  return (
    <div role="region" aria-roledescription="carousel" aria-label="Post photos" className="relative mt-3 overflow-hidden rounded-xl bg-black" onTouchStart={(e) => setTouchStart(e.touches[0]?.clientX ?? null)} onTouchEnd={(e) => { if (touchStart !== null && Math.abs((e.changedTouches[0]?.clientX ?? touchStart) - touchStart) > 40) move((e.changedTouches[0]?.clientX ?? touchStart) < touchStart ? 1 : -1); setTouchStart(null); }} onTouchCancel={() => setTouchStart(null)}>
      <div className="relative min-h-[220px]">{selected.kind === "IMAGE" ? <Image src={selected.url} alt={`Photo ${activeIndex + 1} of ${media.length}`} width={800} height={420} className="w-full max-h-[420px] object-contain" /> : <video src={selected.url} controls className="w-full max-h-[420px] bg-black" />}<button type="button" onClick={() => move(-1)} disabled={activeIndex === 0} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-white disabled:invisible">‹</button><button type="button" onClick={() => move(1)} disabled={activeIndex === media.length - 1} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-white disabled:invisible">›</button></div>
      <div className="flex justify-center gap-1.5 bg-black/80 py-2" aria-label={`Photo ${activeIndex + 1} of ${media.length}`}>{media.map((item, itemIndex) => <button key={item.id} type="button" onClick={() => setIndex(itemIndex)} aria-label={`Show photo ${itemIndex + 1}`} aria-current={itemIndex === activeIndex} className={`h-1.5 rounded-full transition-all ${itemIndex === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />)}</div>
    </div>
  );
}
