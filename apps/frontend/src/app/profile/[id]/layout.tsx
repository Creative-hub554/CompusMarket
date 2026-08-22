import type { Metadata } from "next";
import { cache } from "react";
import { languageAlternates } from "@/lib/site";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

type Profile = {
  id: string;
  name?: string | null;
  bio?: string | null;
};

// cache() dedupes the fetch between generateMetadata and the layout render.
const getProfile = cache(async (id: string): Promise<Profile | null> => {
  try {
    const res = await fetch(`${API_BASE}/profiles/${id}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Profile;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  const name = profile?.name || "Profile";
  return {
    title: name,
    description: profile?.bio?.slice(0, 160),
    alternates: {
      canonical: `/profile/${id}`,
      languages: languageAlternates(`/profile/${id}`),
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
