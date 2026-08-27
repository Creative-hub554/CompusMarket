"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

interface LocalizedProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviewCount?: number;
  className?: string;
}

export function LocalizedProductCard({ 
  id, 
  name, 
  price, 
  originalPrice, 
  image, 
  rating, 
  reviewCount, 
  className 
}: LocalizedProductCardProps) {
  const locale = useLocale();
  const t = useTranslations("productCard");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US", {
      style: "currency",
      currency: locale === "km" ? "KHR" : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const discountPercentage = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div className={`rounded-lg border overflow-hidden hover:shadow-lg transition-shadow ${className}`} style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-subtle)" }}>
      <div className="relative">
        <Image
          src={image}
          alt={name}
          width={300}
          height={300}
          className="w-full h-48 object-cover"
        />
        {discountPercentage > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
            -{discountPercentage}% {t("off")}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2" style={{ color: "var(--text-body)" }}>
          {name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>{formatPrice(price)}</span>
            {originalPrice && (
              <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>{formatPrice(originalPrice)}</span>
            )}
          </div>
          
          {rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-body)" }}>{rating}</span>
              {reviewCount && (
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>({reviewCount})</span>
              )}
            </div>
          )}
        </div>
        
        <Link
          href={`/products/${id}`}
          className="block w-full py-2 px-4 rounded-lg font-medium text-center transition-colors"
          style={{ 
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)"
          }}
        >
          {t("viewDetails")}
        </Link>
      </div>
    </div>
  );
}