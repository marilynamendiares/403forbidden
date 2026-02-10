import { prisma } from "@/server/db";
import { coerceMediaKey } from "@/lib/media";

async function main() {
  const profiles = await prisma.profile.findMany({
    select: { userId: true, avatarUrl: true, bannerUrl: true },
  });

  let changed = 0;

  for (const p of profiles) {
    const a = coerceMediaKey(p.avatarUrl);
    const b = coerceMediaKey(p.bannerUrl);

    const need =
      (p.avatarUrl ?? null) !== (a ?? null) || (p.bannerUrl ?? null) !== (b ?? null);

    if (!need) continue;

    await prisma.profile.update({
      where: { userId: p.userId },
      data: { avatarUrl: a, bannerUrl: b },
    });

    changed++;
  }

  console.log(`Done. Updated profiles: ${changed}/${profiles.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
