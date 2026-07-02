import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <Link href="/admin" className="text-lg font-bold block mb-6">
          Admin Panel
        </Link>
        <nav className="space-y-1 text-sm">
          <Link
            href="/admin"
            className="block rounded px-3 py-2 hover:bg-gray-200"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/products"
            className="block rounded px-3 py-2 hover:bg-gray-200"
          >
            Products
          </Link>
          <Link
            href="/admin/categories"
            className="block rounded px-3 py-2 hover:bg-gray-200"
          >
            Categories
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
