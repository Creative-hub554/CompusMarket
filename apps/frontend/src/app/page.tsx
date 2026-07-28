import Link from "next/link";

export default function Home() {
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
              Premium second-hand electronics, verified sellers, community powered.
            </p>
          </div>
          <div className="mt-10 flex gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Link
              href="/shop"
              className="inline-block rounded-lg bg-khmer-gold text-khmer-blue px-10 py-3 font-bold tracking-wide hover:bg-yellow-500 transition-all hover:scale-[1.03] shadow-xl"
            >
              Browse Shop
            </Link>
            <Link
              href="/community"
              className="inline-block rounded-lg border border-white/30 text-white/90 px-10 py-3 font-medium tracking-wide hover:bg-white/10 transition-all hover:scale-[1.03]"
            >
              Community
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-3xl font-bold tracking-wide">
              Why <span className="text-khmer-blue">KHMERONLINESHOP</span>
            </h2>
            <p className="text-xs tracking-[0.3em] text-khmer-gold mt-1 uppercase">bytheo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {[
              {
                title: "Quality Electronics",
                desc: "Every device graded A–C with warranty options. Verified before listing.",
                icon: "🛡️",
              },
              {
                title: "Trusted Sellers",
                desc: "ID-verified sellers. Chat directly before buying. Zero counterfeits.",
                icon: "🤝",
              },
              {
                title: "Community First",
                desc: "Free resume builder, career guides, AI tools — we're more than a shop.",
                icon: "🌱",
              },
            ].map((f) => (
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
          <h2 className="font-['Playfair_Display'] text-3xl font-bold mb-4">Become a Seller</h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
            Join our marketplace. Get verified within 3 days and start listing your products.
          </p>
          <Link
            href="/seller/apply"
            className="inline-block rounded-lg bg-khmer-gold text-khmer-blue px-10 py-3 font-bold tracking-wide hover:bg-yellow-500 transition-all hover:scale-[1.03] shadow-xl"
          >
            Apply Now
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
              <Link href="/terms/buyer" className="hover:text-white transition-colors">Buyer Terms</Link>
              <Link href="/terms/seller" className="hover:text-white transition-colors">Seller Terms</Link>
            </div>
            <p className="text-xs">&copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
