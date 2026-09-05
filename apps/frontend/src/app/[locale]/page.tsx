import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ShieldCheck,
  Handshake,
  Sprout,
  MessagesSquare,
  Store,
  Briefcase,
  ArrowRight,
  Check,
} from "lucide-react";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

// Coral gradient variants (cycled across category tiles) — from the coral `gold-*` scale.
const CAT_GRADIENTS = [
  "from-gold-500 to-gold-300",
  "from-gold-400 to-gold-600",
  "from-gold-300 to-gold-500",
  "from-gold-600 to-gold-400",
  "from-gold-500 to-gold-200",
  "from-gold-400 to-gold-300",
  "from-gold-600 to-gold-300",
  "from-gold-500 to-gold-100",
];

export default async function Home() {
  // Social-first: signed-in users land on their feed, guests see the landing.
  const { userId } = await auth();
  if (userId) redirect("/feed");

  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const categories = await api.categories.list().catch(() => []);

  const features = [
    { title: t("feature1Title"), desc: t("feature1Desc"), Icon: ShieldCheck },
    { title: t("feature2Title"), desc: t("feature2Desc"), Icon: Handshake },
    { title: t("feature3Title"), desc: t("feature3Desc"), Icon: Sprout },
  ];
  const tiles = categories.slice(0, 8);
  const pillars = [
    { href: "/feed", label: nav("social"), Icon: MessagesSquare },
    { href: "/market", label: nav("market"), Icon: Store },
    { href: "/jobs", label: nav("jobs"), Icon: Briefcase },
  ];

  // Gradient the last word of the headline, language-agnostic.
  const title = t("heroTitle");
  const lastSpace = title.lastIndexOf(" ");
  const titleHead = lastSpace > 0 ? title.slice(0, lastSpace) : title;
  const titleTail = lastSpace > 0 ? title.slice(lastSpace + 1) : "";
  const trust = t("heroTagline")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-14 pb-10 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl font-extrabold tracking-tight leading-[1.05] text-[var(--text-body)] md:text-6xl">
              {titleHead}{" "}
              {titleTail && <span className="text-gradient">{titleTail}</span>}
            </h1>
            <p className="mt-5 max-w-xl text-base text-[var(--text-muted)] md:text-lg">
              {t("heroSubtitle")}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--text-body)]">
              {trust.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check size={16} className="text-gold" />
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-8 py-3.5 text-base font-bold text-white shadow-[0_10px_30px_-8px_rgba(255,107,94,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-8px_rgba(255,107,94,0.85)]"
              >
                {t("browseShop")}
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/seller/apply"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-8 py-3.5 font-semibold text-[var(--text-body)] transition-colors hover:bg-[var(--surface-2)]"
              >
                {t("becomeSeller")}
              </Link>
            </div>
          </div>

          {/* Floating product card */}
          <div className="relative hidden h-[420px] md:block animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="absolute left-1/2 top-1/2 w-[270px] -translate-x-1/2 -translate-y-[52%] animate-temple-float rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[0_30px_60px_-30px_rgba(23,23,31,0.5)]">
              <div className="flex h-[300px] items-end rounded-2xl bg-gradient-to-br from-gold to-gold-light p-4">
                <span className="text-base font-bold text-white">
                  Graded, verified,
                  <br />
                  ready to ship.
                </span>
              </div>
              <div className="flex items-center justify-between px-1 pb-1 pt-3">
                <span className="text-sm font-semibold text-[var(--text-body)]">iPhone 13 Pro · 256GB</span>
                <span className="text-base font-bold text-[var(--text-body)]">$640</span>
              </div>
            </div>
            <span className="absolute left-0 top-[14%] inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-green-600 shadow-[0_14px_30px_-16px_rgba(23,23,31,0.5)] animate-temple-float" style={{ animationDelay: "0.8s" }}>
              <Check size={15} />
              Verified seller
            </span>
            <span className="absolute bottom-[16%] right-0 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-body)] shadow-[0_14px_30px_-16px_rgba(23,23,31,0.5)] animate-temple-float" style={{ animationDelay: "1.6s" }}>
              <span className="tracking-wider text-amber-500">★★★★★</span>
              4.9 · 2.1k reviews
            </span>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 transition hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_20px_44px_-24px_rgba(23,23,31,0.5)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-light text-white">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-[var(--text-body)]">{label}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories bento */}
      {tiles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-7 max-w-xl">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-gold">{nav("shop")}</div>
            <p className="mt-2 text-sm text-[var(--text-muted)] md:text-base">{t("tilesCaption")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:[grid-auto-rows:128px]">
            {tiles.map((cat, i) => {
              const featured = i === 0;
              return (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className={`group relative flex items-end overflow-hidden rounded-2xl bg-gradient-to-br ${CAT_GRADIENTS[i % CAT_GRADIENTS.length]} p-4 text-white transition hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px_rgba(23,23,31,0.6)] ${
                    featured ? "col-span-2 row-span-2" : ""
                  }`}
                >
                  <span className="absolute right-3.5 top-3.5 flex h-7 w-7 -translate-x-1 translate-y-1 items-center justify-center rounded-full bg-white/25 opacity-0 transition group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowRight size={14} />
                  </span>
                  <span className="relative z-10">
                    <span className="block text-base font-bold md:text-lg">{cat.name}</span>
                    <span className="mt-1 block text-xs font-medium opacity-85">{cat._count.products} items</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-[var(--text-body)] md:text-4xl">
          {t("whyTitle")} <span className="text-gradient">Champey</span>
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map(({ title, desc, Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 transition hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_20px_44px_-24px_rgba(23,23,31,0.5)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,107,94,0.12)] text-gold">
                <Icon size={22} />
              </span>
              <h3 className="mt-5 text-xl font-bold text-[var(--text-body)]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-[26px] bg-gradient-to-br from-gold to-gold-light px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("becomeSeller")}</h2>
          <p className="mx-auto mt-4 max-w-md text-white/90">{t("becomeSellerDesc")}</p>
          <Link
            href="/seller/apply"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 font-bold text-[#17171f] transition hover:-translate-y-0.5"
          >
            {t("applyNow")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
