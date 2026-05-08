import { prisma } from "@/server/db";
import { ServerTimingCollector } from "@/server/observability";

async function main() {
  const collector = new ServerTimingCollector(true);

  await collector.run(async () => {
    await prisma.notification.count();
  });

  console.log(JSON.stringify({ summary: collector.getQuerySummary() }, null, 2));
  await prisma.$disconnect();
}

void main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
