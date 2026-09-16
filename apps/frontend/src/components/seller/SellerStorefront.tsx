import { prisma } from "@theo/database";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export type SellerStorefrontIdentity =
  | { username: string }
  | { userId: string };

export function getSellerDisplayName(name: string | null | undefined): string {
  return name?.trim() || "Seller";
}

export async function getPublicSellerStorefront(identity: SellerStorefrontIdentity) {
  const where = "username" in identity
    ? { user: { username: identity.username } }
    : { userId: identity.userId };

  return prisma.sellerProfile.findFirst({
    where: {
      ...where,
      verificationStatus: "APPROVED",
    },
    include: {
      user: { select: { name: true } },
      products: {
        where: {
          status: "ACTIVE",
          seller: { verificationStatus: "APPROVED" },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function SellerStorefront({
  identity,
}: {
  identity: SellerStorefrontIdentity;
}) {
  const sellerProfile = await getPublicSellerStorefront(identity);

  if (!sellerProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Shop Not Found</h1>
        <p className="text-slate-600">
          This seller shop does not exist or is not yet approved.
        </p>
      </div>
    );
  }

  const sellerName = getSellerDisplayName(sellerProfile.user.name);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{sellerName}&apos;s Shop</h1>
        <p className="text-slate-600 mt-1">
          {sellerProfile.products.length} products
        </p>
        {sellerProfile.address && (
          <p className="text-sm text-slate-500 mt-2">{sellerProfile.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sellerProfile.products.map((product) => {
          const images = (product.images as string[]) || [];
          return (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-slate-100">
                {images[0] ? (
                  <Image
                    src={images[0]}
                    alt={product.name}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{product.name}</h3>
                <p className="text-lg font-bold text-gold-600 mt-1">
                  ${product.price.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Condition: {product.condition}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {sellerProfile.products.length === 0 && (
        <p className="text-center text-slate-500 py-12">
          No products available yet.
        </p>
      )}
    </div>
  );
}
