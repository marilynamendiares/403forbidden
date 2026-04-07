import { prisma } from "@/server/db";
import { rebuildAllArcDiscoveryFoundation } from "@/server/arcs/discoveryFoundation";

async function main() {
  const result = await rebuildAllArcDiscoveryFoundation(prisma);
  console.log(`Rebuilt discovery foundation for ${result.count} arc(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to rebuild ARCS discovery foundation", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
