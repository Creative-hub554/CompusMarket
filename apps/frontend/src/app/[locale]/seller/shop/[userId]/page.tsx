import { SellerStorefront } from "@/components/seller/SellerStorefront";

export default async function SellerShopPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <SellerStorefront identity={{ userId }} />;
}
