import { prisma } from "@theo/database";
import Link from "next/link";

export default async function SellerShopPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true } },
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!sellerProfile || sellerProfile.verificationStatus !== "APPROVED") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Shop Not Found</h1>
        <p className="text-gray-600">This seller shop does not exist or is not yet approved.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{sellerProfile.user.name || sellerProfile.user.email}&apos;s Shop</h1>
        <p className="text-gray-600 mt-1">{sellerProfile.products.length} products</p>
        {sellerProfile.address && (
          <p className="text-sm text-gray-500 mt-2">{sellerProfile.address}</p>
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
              <div className="aspect-square bg-gray-100">
                {images[0] ? (
                  <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate">{product.name}</h3>
                <p className="text-lg font-bold text-blue-600 mt-1">${product.price.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Condition: {product.condition}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {sellerProfile.products.length === 0 && (
        <p className="text-center text-gray-500 py-12">No products available yet.</p>
      )}
    </div>
  );
}
