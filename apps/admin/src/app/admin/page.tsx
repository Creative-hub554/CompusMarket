import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { api, Product, Category } from "@/services/api";

export default async function AdminDashboard() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const [products, categories] = await Promise.all([
    api.products.list().catch(() => [] as Product[]),
    api.categories.list().catch(() => [] as Category[]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-3xl font-bold">{categories.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">User Role</p>
          <p className="text-3xl font-bold capitalize">
            {session.user?.role?.toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
