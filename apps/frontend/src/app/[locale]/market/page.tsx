import { permanentRedirect } from "next/navigation";

// Shop and Marketplace are the same event: one product catalog. /market
// now resolves to /shop so old links keep working while the UI shows a
// single destination. /market/ads (banner buying) still lives under this
// route and is unaffected.
export default function MarketPage() {
  permanentRedirect("/shop");
}