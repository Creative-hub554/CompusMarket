import type { Metadata } from "next";
import { cache } from "react";
import { languageAlternates } from "@/lib/site";
import { apiFetch } from "@/lib/apiFetch";

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
    return await apiFetch<Profile>(`/profiles/${id}`, { cache: "no-store" });
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
