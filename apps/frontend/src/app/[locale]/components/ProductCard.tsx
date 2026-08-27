"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type ProductCardProps = {
  id: string;
  name: string;
  price: number;
  image: string;
  condition: "A" | "B" | "C";
  warrantyMonths: number;
  sellerVerified: boolean;
};

export default function ProductCard({
  id,
  name,
  price,
  image,
  condition,
  warrantyMonths,
  sellerVerified,
}: ProductCardProps) {
  const t = useTranslations("product");

  const conditionLabels = {
    A: t("conditionA"),
    B: t("conditionB"),
    C: t("conditionC"),
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/products/${id}`} className="block">
        <div className="relative aspect-square">
          <Image
            src={image}
            alt={name}
            fill
            className="rounded-t-lg object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {sellerVerified && (
            <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Verified
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{name}</h3>
          <p className="text-2xl font-bold text-green-600 mb-2">
            ${price.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{conditionLabels[condition]}</span>
            <span>{warrantyMonths}mo {t("warrantyMonths").replace("{months}", warrantyMonths.toString())}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}