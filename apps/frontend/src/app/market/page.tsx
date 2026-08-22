import { prisma } from "@theo/database";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const t = await getTranslations("market");

  const sellers = await prisma.sellerProfile.findMany({
    where: { verificationStatus: "APPROVED" },
    include: {
      user: { select: { name: true, email: true } },
      _count: {
        select: { products: { where: { status: "ACTIVE" } } },
      },
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { images: true },
      },
    },
  });

  sellers.sort((a, b) => b._count.products - a._count.products);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">{t("title")}</h1>
        <p className="text-slate-500 mt-1">{t("subtitle")}</p>
      </div>

      {sellers.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-white">
          <h2 className="text-xl font-semibold mb-2">{t("emptyTitle")}</h2>
          <p className="text-slate-500 mb-6">{t("emptyText")}</p>
          <Link
            href="/seller/apply"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {t("becomeSeller")}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-4">
            {t("sellersCount", { count: sellers.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellers.map((seller) => (
              <Link
                key={seller.id}
                href={`/seller/shop/${seller.userId}`}
                className="group block border rounded-xl overflow-hidden bg-white hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 p-4 border-b bg-slate-50">
                  <div className="w-11 h-11 rounded-full bg-khmer-blue text-white flex items-center justify-center font-bold shrink-0">
                    {(seller.user.name || seller.user.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold truncate group-hover:text-indigo-600 transition-colors">
                      {seller.user.name || seller.user.email}
                    </h2>
                    <span
                      className={`inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        seller.accountType === "BUSINESS"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {seller.accountType === "BUSINESS"
                        ? t("business")
                        : t("personal")}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {t("productsCount", { count: seller._count.products })}
                    {seller.address ? ` · ${seller.address}` : ""}
                  </p>
                  {seller.products.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {seller.products.map((product, i) => {
                        const images = (product.images as string[]) || [];
                        return (
                          <div
                            key={i}
                            className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden"
                          >
                            {images[0] ? (
                              <img
                                src={images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <span className="inline-block mt-3 text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
                    {t("visitShop")} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
