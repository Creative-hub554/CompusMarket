import { getTranslations } from "next-intl/server";
import { SectionSidebar, type SidebarGroup } from "./SectionSidebar";

type Section = "market" | "jobs" | "community";

export async function SectionShell({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");

  let title = "";
  let groups: SidebarGroup[] = [];

  if (section === "market") {
    title = t("market");
    groups = [
      {
        label: t("buying"),
        items: [
          { href: "/shop", label: t("shop") },
          { href: "/market", label: t("market") },
          { href: "/orders", label: t("orders") },
          { href: "/warranties", label: t("warranties") },
        ],
      },
      {
        label: t("selling"),
        items: [
          { href: "/seller/dashboard", label: t("seller") },
          { href: "/seller/products", label: t("products") },
          { href: "/seller/orders", label: t("sellerOrders") },
        ],
      },
    ];
  } else if (section === "jobs") {
    title = t("jobs");
    groups = [
      {
        items: [
          { href: "/jobs", label: t("jobBoard") },
          { href: "/jobs/post", label: t("postJob") },
          { href: "/jobs/my-applications", label: t("myApplications") },
          { href: "/community/resume", label: t("resume") },
        ],
      },
    ];
  } else {
    title = t("community");
    groups = [
      {
        items: [
          { href: "/feed", label: t("feed") },
          { href: "/community", label: t("community") },
          { href: "/community/groups", label: t("groups") },
          { href: "/messages", label: t("messages") },
        ],
      },
    ];
  }

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <SectionSidebar title={title} groups={groups} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
