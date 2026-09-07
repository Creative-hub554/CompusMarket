"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

export default function MarketPage() {
  const router = useRouter();

  useEffect(() => {
    // Shop and Marketplace share the same catalog — merged browse lives at /shop.
    router.replace("/shop");
  }, [router]);

  return null;
}
