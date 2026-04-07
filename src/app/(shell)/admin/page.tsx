import AdminSectionCard from "@/components/admin/AdminSectionCard";
import AdminWalletToolsClient from "@/components/admin/AdminWalletToolsClient";

export default function AdminPage() {
  return (
    <AdminSectionCard
      eyebrow="Operator Tools"
      title="Manual Wallet Tool"
      subtitle="Find the player, adjust eurodollars or reputation, and commit a single audited mutation."
    >
      <AdminWalletToolsClient />
    </AdminSectionCard>
  );
}
