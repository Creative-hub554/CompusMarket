import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const categories = await api.categories.list();

  const features = [
    { title: t("feature1Title"), desc: t("feature1Desc"), icon: "🛡️" },
    { title: t("feature2Title"), desc: t("feature2Desc"), icon: "🤝" },
    { title: t("feature3Title"), desc: t("feature3Desc"), icon: "🌱" },
  ];
  const tiles = categories.slice(0, 4);

  return (
    <div>
      {/* Hero: split layout */}
      <section className="bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-[#4338ca] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_55%)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center relative">
          <div className="animate-fade-in-up">
            <p className="text-xs md:text-sm tracking-[0.3em] text-indigo-300 font-semibold uppercase">
              bytheo
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mt-3">
              {t("heroTitle")}
            </h1>
            <p className="text-white/70 mt-4 text-base md:text-lg font-light max-w-md">
              {t("heroTagline")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-block rounded-lg bg-indigo-600 text-white px-8 py-3 font-bold hover:bg-indigo-500 transition-all hover:scale-[1.03] shadow-xl"
              >
                {t("browseShop")}
              </Link>
              <Link
                href="/seller/apply"
                className="inline-block rounded-lg border border-white/30 text-white/90 px-8 py-3 font-semibold hover:bg-white/10 transition-all hover:scale-[1.03]"
              >
                {t("becomeSeller")}
              </Link>
            </div>
          </div>
          <div className="hidden md:flex animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="ml-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur w-full max-w-sm p-8 flex flex-col items-center justify-center gap-4 aspect-square">
              <span className="text-6xl">🛍️</span>
              <p className="text-white/80 text-sm text-center">
                {t("tilesCaption")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      {tiles.length > 0 && (
        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tiles.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className="card-hover rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-indigo-300"
                >
                  <div className="text-3xl mb-2">🛍️</div>
                  <div className="font-bold text-slate-900">{cat.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-center">
            {t("whyTitle")} <span className="text-indigo-600">KHMERONLINESHOP</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 stagger-children">
            {features.map((f) => (
              <div key={f.title} className="card-hover rounded-2xl border border-slate-200 p-10 text-left bg-white shadow-sm hover:border-indigo-200">
                <span className="text-3xl mb-5 block">{f.icon}</span>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-3xl font-extrabold mb-4 tracking-tight">{t("becomeSellerDesc")}</h2>
          <Link
            href="/seller/apply"
            className="inline-block rounded-lg bg-indigo-600 text-white px-10 py-3 font-bold hover:bg-indigo-500 transition-all hover:scale-[1.03] shadow-xl"
          >
            {t("applyNow")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white/50 text-sm">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-base font-bold tracking-wider text-white">
                KHMERONLINESHOP
              </p>
              <p className="text-[10px] tracking-[0.3em] text-indigo-400 mt-0.5">bytheo</p>
            </div>
            <div className="flex gap-8 text-xs tracking-wide">
              <Link href="/terms/buyer" className="hover:text-white transition-colors">{nav("buyerTerms")}</Link>
              <Link href="/terms/seller" className="hover:text-white transition-colors">{nav("sellerTerms")}</Link>
            </div>
            <p className="text-xs">&copy; {new Date().getFullYear()} {t("allRightsReserved")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
