import { requireAdminPage } from "@/lib/require-admin-page";
import { AdminShell } from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authorization: middleware only checks authentication (edge
  // runtime has no Postgres), so the current DB role is validated here on
  // every /admin page render. Non-admins land on /forbidden.
  await requireAdminPage();

  return <AdminShell>{children}</AdminShell>;
}