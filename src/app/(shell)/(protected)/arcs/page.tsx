import { redirect } from "next/navigation";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import ShellSurfaceSetter from "@/app/shell/ShellSurface";
import ShellScrollModeSetter from "@/app/shell/ShellScrollMode";
import ArcsLiveClient from "@/components/ArcsLiveClient";
import ArcsDiscoveryClient from "@/components/arcs/ArcsDiscoveryClient";
import { getViewerId } from "@/server/authViewer";
import { getArcsCatalog, getArcsDiscovery } from "@/server/repos/arcs";
import { isPlayer } from "@/server/player";
import { requireSessionUserId } from "@/server/session";
import { createArc } from "@/server/services/arcs";

export const dynamic = "force-dynamic";

export default async function ArcsPage() {
  const viewerId = await getViewerId();
  const canCreateArc = await isPlayer(viewerId);
  const [initialDiscovery, initialCatalog] = await Promise.all([
    getArcsDiscovery(viewerId),
    getArcsCatalog({ viewerId, sort: "recent", limit: 12 }),
  ]);

  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "");
    const tagline = String(formData.get("tagline") || "");
    const userId = await requireSessionUserId();
    if (!(await isPlayer(userId))) {
      throw new Error("PLAYER_REQUIRED");
    }

    const created = await createArc({
      userId,
      title,
      tagline: tagline || null,
    });
    redirect(`/arcs/${created.slug}`);
  }

  return (
    <>
      <ShellScrollModeSetter mode="split" />
      <ShellVariantSetter variant="full" />
      <ShellSurfaceSetter surface="light" />

      <div className="flex h-full min-h-0 w-full flex-col text-[#2D2D2D]">
        <ArcsDiscoveryClient
          initialDiscovery={initialDiscovery}
          initialCatalog={initialCatalog}
          createAction={create}
          canCreateArc={canCreateArc}
        />
        <ArcsLiveClient />
      </div>
    </>
  );
}
