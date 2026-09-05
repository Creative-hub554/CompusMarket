"use client";

import Image from "next/image";

export function Avatar({
  user,
  size = 40,
  online,
}: {
  user: { name?: string | null; username?: string | null; image?: string | null };
  size?: number;
  online?: boolean;
}) {
  const label = user.name || user.username || "?";
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {user.image ? (
        <Image
          src={user.image}
          alt={label}
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light font-semibold text-white"
          style={{ fontSize: size * 0.42 }}
        >
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full border-2 border-white dark:border-slate-900 ${
            online ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </span>
  );
}
