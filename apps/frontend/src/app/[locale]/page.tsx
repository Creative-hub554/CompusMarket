import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Handshake,
  Sprout,
  MessagesSquare,
  Store,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { api } from "@/services/api";
import { categoryThumbs } from "@/components/community/CategoryThumbs";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Social-first: signed-in users land on their feed, guests see the landing.
  const jar = await cookies();
  const hasSession =
    jar.has("next-auth.session-token") ||
    jar.has("__Secure-next-auth.session-token");
  if (hasSession) redirect("/feed");

  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const categories = await api.categories.list();

  const features = [
    { title: t("feature1Title"), desc: t("feature1Desc"), Icon: ShieldCheck },
    { title: t("feature2Title"), desc: t("feature2Desc"), Icon: Handshake },
    { title: t("feature3Title"), desc: t("feature3Desc"), Icon: Sprout },
  ];
  const tiles = categories.slice(0, 7);
  const pillars = [
    { href: "/feed", label: nav("social"), Icon: MessagesSquare },
    { href: "/market", label: nav("market"), Icon: Store },
    { href: "/jobs", label: nav("jobs"), Icon: Briefcase },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Part 1 · Hero box: navy/gold mesh */}
      <section className="section-box gradient-mesh text-white">
        <div className="px-6 md:px-12 py-14 md:py-20 grid md:grid-cols-2 gap-12 items-center relative">
          <div className="animate-fade-in-up relative z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/champey-mark.svg" alt="" width={28} height={28} />
              <p className="text-xs md:text-sm tracking-[0.3em] text-gold-light font-semibold uppercase">
                bytheo
              </p>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.08] mt-4">
              {t("heroTitle")}{" "}
              <span className="text-gradient">champey</span>
            </h1>
            <p className="text-white/70 mt-5 text-base md:text-lg font-light max-w-md">
              {t("heroTagline")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light text-slate-950 px-8 py-3.5 font-bold shadow-[0_8px_30px_-6px_rgba(212,160,39,0.6)] hover:shadow-[0_10px_36px_-6px_rgba(212,160,39,0.85)] hover:-translate-y-0.5 transition-all"
              >
                {t("browseShop")}
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/seller/apply"
                className="inline-block rounded-xl border border-gold/40 bg-white/5 backdrop-blur text-gold-light px-8 py-3.5 font-semibold hover:bg-gold/10 hover:-translate-y-0.5 transition-all"
              >
                {t("becomeSeller")}
              </Link>
            </div>
          </div>

          <div className="hidden md:block relative h-96 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 glass-card !bg-white/10 !border-gold/30 p-10 flex flex-col items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/champey-mark.svg"
                alt=""
                width={120}
                height={120}
                className="animate-temple-float drop-shadow-[0_0_30px_rgba(212,160,39,0.55)]"
              />
              <p className="text-white/80 text-sm text-center max-w-[16rem]">
                {t("tilesCaption")}
              </p>
            </div>
            <div className="absolute -top-1 right-2 glass-card !bg-white/10 !border-gold/30 !rounded-xl px-4 py-2.5 flex items-center gap-2 animate-temple-float" style={{ animationDelay: "0.8s" }}>
              <MessagesSquare size={16} className="text-gold-light" />
              <span className="text-xs font-semibold text-white/90">{nav("social")}</span>
            </div>
            <div className="absolute bottom-2 left-0 glass-card !bg-white/10 !border-gold/30 !rounded-xl px-4 py-2.5 flex items-center gap-2 animate-temple-float" style={{ animationDelay: "1.6s" }}>
              <Store size={16} className="text-gold" />
              <span className="text-xs font-semibold text-white/90">{nav("market")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Part 2 · Pillars box */}
      <section className="section-box">
        <div className="px-4 py-4 grid grid-cols-3 gap-4">
          {pillars.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-center gap-3 rounded-xl py-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold/15 to-gold-light/15 text-gold-dark dark:text-gold-light">
                <Icon size={18} />
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-gold-dark dark:group-hover:text-gold-light transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Part 3 · Category bento box */}
      {tiles.length > 0 && (
        <section className="section-box">
          <div className="p-4 md:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px]">
            {tiles.map((cat, i) => {
              const Thumb = categoryThumbs[cat.slug] ?? categoryThumbs.patterns;
              const featured = i === 0;
              return (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className={`bento-card group flex flex-col ${featured ? "col-span-2 row-span-2" : ""}`}
                >
                  <div className={`flex-1 flex items-center justify-center overflow-hidden ${featured ? "p-8" : "p-4"}`}>
                    <Thumb className={`w-full h-full transition-transform duration-500 group-hover:scale-110 ${featured ? "max-h-52" : "max-h-24"}`} />
                  </div>
                  <div className="px-5 pb-4 flex items-center justify-between">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{cat.name}</div>
                    <span className="text-[11px] font-medium text-slate-400">{cat._count.products}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Part 4 · Features box */}
      <section className="section-box">
        <div className="px-6 py-12 md:py-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">
            {t("whyTitle")}{" "}
            <span className="text-gradient">Champey</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 stagger-children">
            {features.map(({ title, desc, Icon }) => (
              <div key={title} className="bento-card p-9 text-left">
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-light text-slate-950 shadow-[0_8px_20px_-6px_rgba(212,160,39,0.6)]">
                  <Icon size={22} />
                </span>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Part 5 · CTA box */}
      <section className="section-box gradient-mesh text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-6 tracking-tight">
            {t("becomeSellerDesc")}
          </h2>
          <Link
            href="/seller/apply"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light text-slate-950 px-10 py-3.5 font-bold shadow-[0_8px_30px_-6px_rgba(212,160,39,0.6)] hover:-translate-y-0.5 transition-all"
          >
            {t("applyNow")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
