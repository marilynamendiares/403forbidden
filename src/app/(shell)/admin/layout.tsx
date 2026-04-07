import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/server/session";
import { isAdminSession } from "@/server/admin";
import AdminLayoutFrame from "@/components/admin/AdminLayoutFrame";
import { getAdminDashboardSummary } from "@/server/services/adminControl";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { session } = await getSessionViewer();

  if (!isAdminSession(session)) {
    redirect("/forum");
  }

  const currentPath = (await headers()).get("next-url") || "/admin";
  const summary = await getAdminDashboardSummary();

  const headerByPath = [
    {
      match: (path: string) => path === "/admin",
      eyebrow: "Operator Surface",
      title: "Admin Control",
      subtitle: "",
    },
    {
      match: (path: string) => path.startsWith("/admin/reports"),
      eyebrow: "Moderation Queue",
      title: "Admin Reports",
      subtitle: "Forum moderation cases, reports, and operator actions.",
    },
    {
      match: (path: string) => path.startsWith("/admin/characters"),
      eyebrow: "Character Review",
      title: "Character Applications",
      subtitle: "Review queue for onboarding, approvals and change requests.",
    },
    {
      match: (path: string) => path.startsWith("/admin/wallet"),
      eyebrow: "Economy Ledger",
      title: "Wallet Activity",
      subtitle: "Audited eurodollar and reputation mutations across manual tools and automated systems.",
    },
    {
      match: (path: string) => path.startsWith("/admin/shop"),
      eyebrow: "Commerce Feed",
      title: "Shop Activity",
      subtitle: "Newest world shop acquisitions across the player base.",
    },
  ].find((entry) => entry.match(currentPath)) ?? {
    eyebrow: "Operator Surface",
    title: "Admin Control",
    subtitle: "",
  };

  const railItems = [
    {
      href: "/admin/reports",
      label: "Reports",
      count: summary.reportCount,
      detail: "Moderation cases and forum signals.",
      active: currentPath.startsWith("/admin/reports"),
    },
    {
      href: "/admin/characters",
      label: "Character Queue",
      count: summary.characterQueueCount,
      detail: `Submitted ${summary.submittedCount} · Under review ${summary.underReviewCount}`,
      active: currentPath.startsWith("/admin/characters"),
    },
    {
      href: "/admin/wallet",
      label: "Wallet Activity",
      count: summary.walletActivityCount,
      detail: "Economy ledger across automated and manual changes.",
      active: currentPath.startsWith("/admin/wallet"),
    },
    {
      href: "/admin/shop",
      label: "Shop Activity",
      count: summary.shopAcquisitionCount,
      detail: "Latest world shop purchases and acquisitions.",
      active: currentPath.startsWith("/admin/shop"),
    },
  ];

  return (
    <AdminLayoutFrame
      currentPath={currentPath}
      eyebrow={headerByPath.eyebrow}
      title={headerByPath.title}
      subtitle={headerByPath.subtitle}
      railItems={railItems}
    >
      {children}
    </AdminLayoutFrame>
  );
}
