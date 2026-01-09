import { prisma } from "@/server/db";

const CATEGORIES = [
  {
    slug: "welcome",
    title: "Guestbook / Welcome",
    desc: "Start here",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "MEMBERS",
  },
  {
    slug: "offtopic",
    title: "Lounge / Offtopic",
    desc: "Anything else",
    readVisibility: "MEMBERS",
    createThreadVisibility: "PLAYERS",
    createPostVisibility: "MEMBERS",
  },
  {
    slug: "support",
    title: "Support / Help",
    desc: "Bugs, feedback, questions",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "MEMBERS",
  },
  {
    slug: "player-hub",
    title: "Player Hub",
    desc: "Players only",
    readVisibility: "PLAYERS",
    createThreadVisibility: "PLAYERS",
    createPostVisibility: "PLAYERS",
  },
  {
    slug: "announcements",
    title: "Announcements (Public)",
    desc: "Project news & updates",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "ADMIN",
  },
  {
    slug: "announcements-players",
    title: "Announcements (Players)",
    desc: "Players-only updates",
    readVisibility: "PLAYERS",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "ADMIN",
  },
  {
    slug: "lore",
    title: "Lore / World / Map",
    desc: "World-building, canon, meta",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "ADMIN",
  },
  {
    slug: "rules",
    title: "Rules / Mechanics / FAQ",
    desc: "Rules and how-to",
    readVisibility: "PUBLIC",
    createThreadVisibility: "ADMIN",
    createPostVisibility: "ADMIN",
  },
] as const;

async function main() {
  // ⚠️ Adjust model/fields if your Prisma schema differs:
  // If your model is prisma.forumCategory and it requires (slug, title),
  // keep as is. If it uses name instead of title, swap accordingly.
  for (const c of CATEGORIES) {
    await prisma.forumCategory.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        desc: c.desc,
        readVisibility: c.readVisibility as any,
        createThreadVisibility: c.createThreadVisibility as any,
        createPostVisibility: c.createPostVisibility as any,
      },
      create: {
        slug: c.slug,
        title: c.title,
        desc: c.desc,
        readVisibility: c.readVisibility as any,
        createThreadVisibility: c.createThreadVisibility as any,
        createPostVisibility: c.createPostVisibility as any,
      },
    });
  }


  console.log(`Seeded ${CATEGORIES.length} forum categories`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
