import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold">
          Theo Platform
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <Link href="/shop" className="hover:text-blue-600">
            Shop
          </Link>
          <Link href="/community" className="hover:text-blue-600">
            Community
          </Link>
          <Link href="/careers" className="hover:text-blue-600">
            Careers
          </Link>
        </div>
      </div>
    </nav>
  );
}
