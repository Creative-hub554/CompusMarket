import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");

  const features = [
    { title: t("feature1Title"), desc: t("feature1Desc"), icon: "🛡️" },
    { title: t("feature2Title"), desc: t("feature2Desc"), icon: "🤝" },
    { title: t("feature3Title"), desc: t("feature3Desc"), icon: "🌱" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="banner-flag text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,160,39,0.15),transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-4 py-28 text-center relative">
          <div className="animate-fade-in-up">
            <h1 className="font-['Playfair_Display'] text-6xl md:text-7xl font-bold tracking-[0.12em] leading-none">
              KHMERONLINESHOP
            </h1>
            <p className="text-sm md:text-base tracking-[0.4em] text-khmer-gold font-medium mt-2 uppercase">
              bytheo
            </p>
            <div className="w-12 h-0.5 bg-khmer-gold/60 mx-auto rounded-full my-6" />
            <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto font-light tracking-wide">
              {t("heroSubtitle")}
            </p>
          </div>
          <div className="mt-10 flex gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Link
              href="/shop"
              className="inline-block rounded-lg bg-khmer-gold text-khmer-blue px-10 py-3 font-bold tracking-wide hover:bg-yellow-500 transition-all hover:scale-[1.03] shadow-xl"
            >
              {t("browseShop")}
            </Link>
            <Link
              href="/community"
              className="inline-block rounded-lg border border-white/30 text-white/90 px-10 py-3 font-medium tracking-wide hover:bg-white/10 transition-all hover:scale-[1.03]"
            >
              {t("community")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-3xl font-bold tracking-wide">
              {t("whyTitle")} <span className="text-khmer-blue">KHMERONLINESHOP</span>
            </h2>
            <p className="text-xs tracking-[0.3em] text-khmer-gold mt-1 uppercase">bytheo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {features.map((f) => (
              <div key={f.title} className="card-hover rounded-2xl border border-gray-100 p-10 text-left bg-white shadow-sm">
                <span className="text-3xl mb-5 block">{f.icon}</span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-khmer-blue to-khmer-blue-light text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="font-['Playfair_Display'] text-3xl font-bold mb-4">{t("becomeSeller")}</h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            {t("becomeSellerDesc")}
          </p>
          <Link
            href="/seller/apply"
            className="inline-block rounded-lg bg-khmer-gold text-khmer-blue px-10 py-3 font-bold tracking-wide hover:bg-yellow-500 transition-all hover:scale-[1.03] shadow-xl"
          >
            {t("applyNow")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white/50 text-sm">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="font-['Playfair_Display'] text-base font-bold tracking-wider text-white">
                KHMERONLINESHOP
              </p>
              <p className="text-[10px] tracking-[0.3em] text-khmer-gold mt-0.5">bytheo</p>
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
