import { SellerStorefront } from "@/components/seller/SellerStorefront";

export default function SellerSlugStorefrontPage({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}) {
  return params.then(({ sellerSlug }) => (
    <SellerStorefront identity={{ username: sellerSlug }} />
  ));
}
