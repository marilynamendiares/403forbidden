// scripts/seed-shop.ts
import { prisma } from "../src/server/db";

async function main() {
  const items = [
    {
      slug: "neuro-link-v1",
      title: "NeuroLink v1",
      description: "Basic neural interface. Cheap, stable, boring.",
      category: "CYBERWARE",
      priceEurodollars: 15,
      requiredReputation: 0,
    },
    {
      slug: "signal-scrambler",
      title: "Signal Scrambler",
      description: "Makes tracking harder. Doesn’t make you invisible.",
      category: "GADGETS",
      priceEurodollars: 25,
      requiredReputation: 5,
    },
    {
      slug: "kiroshi-basic",
      title: "Optics (Basic)",
      description: "Improved readability, low-light boost.",
      category: "CYBERWARE",
      priceEurodollars: 40,
      requiredReputation: 10,
    },
    {
      slug: "deck-glyph",
      title: "Cyberdeck “Glyph”",
      description: "Entry-level deck for quiet work.",
      category: "CYBERDECKS",
      priceEurodollars: 60,
      requiredReputation: 20,
    },
    {
      slug: "black-ice-toolkit",
      title: "Black ICE Toolkit",
      description: "Serious kit. Serious consequences.",
      category: "CYBERDECKS",
      priceEurodollars: 120,
      requiredReputation: 80,
    },
    {
      slug: "memory-shard",
      title: "Memory Shard",
      description: "Portable encrypted storage, old-school style.",
      category: "UTILITIES",
      priceEurodollars: 20,
      requiredReputation: 0,
    },
    {
      slug: "ghost-key",
      title: "Ghost Key",
      description: "One-time access token for locked doors (in-world).",
      category: "UTILITIES",
      priceEurodollars: 35,
      requiredReputation: 15,
    },
  ];

  for (const it of items) {
    await prisma.shopItem.upsert({
      where: { slug: it.slug },
      create: it,
      update: it,
    });
  }

  console.log(`Seeded ${items.length} shop items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
