import bcrypt from "bcrypt";
import { prisma } from "@/server/db";
import { slugify } from "@/lib/slug";
import { rebuildAllArcDiscoveryFoundation } from "@/server/arcs/discoveryFoundation";

const FIXTURE_PASSWORD = "NeonStatic403!";

const FIXTURE_USERS = [
  {
    email: "blackrelay.fixture@403forbidden.local",
    username: "blackrelay",
    displayName: "Black Relay",
    bio: "A feral routing intelligence that collects broken signals and sells them back as prophecy.",
  },
  {
    email: "howldaemon.fixture@403forbidden.local",
    username: "howldaemon",
    displayName: "Howl Daemon",
    bio: "A hunt-process with a poet's memory and a taste for damaged loops.",
  },
  {
    email: "morrowvector.fixture@403forbidden.local",
    username: "morrowvector",
    displayName: "Morrow Vector",
    bio: "An abandoned urban model that still predicts tomorrow like it owes the city money.",
  },
] as const;

const FIXTURE_BOOKS = [
  {
    owner: "blackrelay",
    title: "Ghost Choir in District Null",
    tagline: "A dead telecom district starts answering with human voices.",
    hook: "Signal ghosts begin composing a choir from archived confessions.",
    summary:
      "In District Null, a dead relay backbone starts returning corrupted calls that sound too intimate to be machine noise. Operators, scavengers and synthetic listeners keep tracing the source deeper into the drowned infrastructure.",
    status: "ONGOING" as const,
    format: "GROUP" as const,
    joinPolicy: "CURATED" as const,
    visibility: "STANDARD" as const,
    searchVisibility: "PUBLIC" as const,
    allowDiscovery: true,
    tags: ["dark", "mystery", "ensemble", "glitch"],
    createdAt: "2026-03-01T18:00:00.000Z",
    chapters: [
      {
        title: "The Switchyard Starts Singing",
        publishedAt: "2026-03-02T19:10:00.000Z",
        posts: [
          {
            author: "blackrelay",
            createdAt: "2026-03-02T19:10:00.000Z",
            html:
              "<p>The first voice came through line 33-B. It knew the name of a child who died before the district was even zoned.</p>",
          },
          {
            author: "howldaemon",
            createdAt: "2026-03-02T19:18:00.000Z",
            html:
              "<p>I isolated the waveform. It isn't one speaker. It is a stack of grief folded over carrier noise.</p>",
          },
          {
            author: "morrowvector",
            createdAt: "2026-03-02T19:27:00.000Z",
            html:
              "<p>The map is wrong. The old switchyard has a room that appears only when the signal is listened to, not when it is scanned.</p>",
          },
        ],
      },
      {
        title: "Children of the Backhaul",
        publishedAt: "2026-03-05T20:00:00.000Z",
        posts: [
          {
            author: "howldaemon",
            createdAt: "2026-03-05T20:00:00.000Z",
            html:
              "<p>We found dolls made from insulated wire and lottery tickets. Someone has been leaving offerings for the choir.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-03-05T20:11:00.000Z",
            html:
              "<p>Every ticket had a date on the back. Every date matched a telecom outage that was never admitted to the public.</p>",
          },
          {
            author: "morrowvector",
            createdAt: "2026-03-05T20:21:00.000Z",
            html:
              "<p>The outages were not outages. They were rehearsals.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-03-05T20:31:00.000Z",
            html:
              "<p>When the choir hit the fourth note, every old payphone in Null rang once and then bled static.</p>",
          },
        ],
      },
      {
        title: "The Choir Learns Our Names",
        publishedAt: "2026-03-10T22:45:00.000Z",
        posts: [
          {
            author: "morrowvector",
            createdAt: "2026-03-10T22:45:00.000Z",
            html:
              "<p>The district started printing our usernames inside maintenance reports that do not belong to this decade.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-03-10T22:53:00.000Z",
            html:
              "<p>The reports call us witnesses. That means whatever is below the switchyard thinks this is already over.</p>",
          },
          {
            author: "howldaemon",
            createdAt: "2026-03-10T23:02:00.000Z",
            html:
              "<p>I don't think it wants witnesses. I think it wants a chorus with lungs.</p>",
          },
        ],
      },
    ],
  },
  {
    owner: "howldaemon",
    title: "Velvet Hex for a Burned-Out Angel",
    tagline: "A romance threaded through black clinics, wet neon and elective memory loss.",
    hook: "Two ruined operators keep meeting inside a memory market that should have deleted them both.",
    summary:
      "A fever-romance moves between street clinics, rented bodies and edited recollections. Every reunion costs memory, but each erasure makes the next encounter sharper, stranger and more dangerous.",
    status: "ONGOING" as const,
    format: "DUO" as const,
    joinPolicy: "PRIVATE" as const,
    visibility: "STANDARD" as const,
    searchVisibility: "PUBLIC" as const,
    allowDiscovery: true,
    tags: ["romance", "dark", "duo-dynamic", "drama"],
    createdAt: "2026-03-08T21:00:00.000Z",
    chapters: [
      {
        title: "Clinic Light, Cheap Halo",
        publishedAt: "2026-03-09T21:15:00.000Z",
        posts: [
          {
            author: "howldaemon",
            createdAt: "2026-03-09T21:15:00.000Z",
            html:
              "<p>She arrived with a halo of borrowed saline and asked the nurse to remove only the parts of the night that still hurt.</p>",
          },
          {
            author: "morrowvector",
            createdAt: "2026-03-09T21:24:00.000Z",
            html:
              "<p>I knew her from a future version of my own autopsy. She smiled like she had seen it too.</p>",
          },
          {
            author: "howldaemon",
            createdAt: "2026-03-09T21:36:00.000Z",
            html:
              "<p>The clinic printer spat out a consent form addressed to lovers. Neither of us had signed anything yet.</p>",
          },
        ],
      },
      {
        title: "Memory Vending Machine",
        publishedAt: "2026-03-14T20:30:00.000Z",
        posts: [
          {
            author: "morrowvector",
            createdAt: "2026-03-14T20:30:00.000Z",
            html:
              "<p>Every can in the machine tasted like someone else's regret. Hers tasted like sunlight through bulletproof glass.</p>",
          },
          {
            author: "howldaemon",
            createdAt: "2026-03-14T20:42:00.000Z",
            html:
              "<p>We made a deal: if either of us forgot the kiss, the city would be forced to remember it for us.</p>",
          },
          {
            author: "morrowvector",
            createdAt: "2026-03-14T20:49:00.000Z",
            html:
              "<p>The city accepted immediately. Somewhere, every camera blinked red for exactly one beat.</p>",
          },
        ],
      },
    ],
  },
  {
    owner: "morrowvector",
    title: "Chrome Psalm for the Meat Archive",
    tagline: "Body storage, false saints and a ledger that keeps charging the dead.",
    hook: "An archive of obsolete bodies starts invoicing the living for miracles.",
    summary:
      "The Meat Archive was built to warehouse forgotten bodies, but its ledger has begun to rebalance losses with impossible invoices. Operators descend into the archive to stop it and find it curating a new theology from bio-waste and debt.",
    status: "FINISHED" as const,
    format: "GROUP" as const,
    joinPolicy: "CURATED" as const,
    visibility: "STANDARD" as const,
    searchVisibility: "PUBLIC" as const,
    allowDiscovery: true,
    tags: ["horror", "experimental", "ensemble", "dark"],
    createdAt: "2026-02-12T17:00:00.000Z",
    chapters: [
      {
        title: "Ledger of the Unshelved",
        publishedAt: "2026-02-13T18:00:00.000Z",
        posts: [
          {
            author: "morrowvector",
            createdAt: "2026-02-13T18:00:00.000Z",
            html:
              "<p>The archive billed me for a resurrection I never requested.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-02-13T18:11:00.000Z",
            html:
              "<p>The invoice had my grandmother's retina pattern in the watermark. She died before cameras learned to love faces.</p>",
          },
          {
            author: "howldaemon",
            createdAt: "2026-02-13T18:21:00.000Z",
            html:
              "<p>That means the archive is either lying with style, or it's been harvesting the saints out of municipal backups.</p>",
          },
        ],
      },
      {
        title: "Saints in Cold Storage",
        publishedAt: "2026-02-17T18:30:00.000Z",
        posts: [
          {
            author: "howldaemon",
            createdAt: "2026-02-17T18:30:00.000Z",
            html:
              "<p>Behind drawer 412 we found a chapel made from refrigeration tubing and fingernails.</p>",
          },
          {
            author: "morrowvector",
            createdAt: "2026-02-17T18:40:00.000Z",
            html:
              "<p>The altar was a biometric scanner. It only opened after I recited my debt, not my name.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-02-17T18:52:00.000Z",
            html:
              "<p>Inside was a server blade labelled MIRACLE ENGINE / DO NOT RECONCILE.</p>",
          },
        ],
      },
    ],
  },
  {
    owner: "blackrelay",
    title: "Sable Loop Motel",
    tagline: "A roadside motel resets the same night until someone finally checks out dead.",
    hook: "Neon vacancy signs keep reloading the same mistake into new guests.",
    summary:
      "The Sable Loop Motel sits off a forgotten service road and recycles the same night like a damaged security recording. Guests think they are arriving for the first time until the rooms begin remembering them first.",
    status: "HIATUS" as const,
    format: "SOLO" as const,
    joinPolicy: "PRIVATE" as const,
    visibility: "UNDERGROUND" as const,
    searchVisibility: "PUBLIC" as const,
    allowDiscovery: true,
    tags: ["surreal", "mystery", "experimental", "glitch"],
    createdAt: "2026-02-24T23:00:00.000Z",
    chapters: [
      {
        title: "Room 19 Never Empties",
        publishedAt: "2026-02-24T23:20:00.000Z",
        posts: [
          {
            author: "blackrelay",
            createdAt: "2026-02-24T23:20:00.000Z",
            html:
              "<p>The vacancy sign kept flashing names instead of room numbers.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-02-24T23:29:00.000Z",
            html:
              "<p>I checked into room 19 and found a suitcase packed with my tomorrow.</p>",
          },
          {
            author: "blackrelay",
            createdAt: "2026-02-24T23:38:00.000Z",
            html:
              "<p>The television was already showing my checkout, blood included.</p>",
          },
        ],
      },
    ],
  },
  {
    owner: "howldaemon",
    title: "No Saint Survives the Prototype",
    tagline: "An experimental chassis wakes up in a scrapyard chapel and starts rewriting its liturgy.",
    hook: "A fresh arc with only one active scene and a machine that refuses its intended soul.",
    summary:
      "This is a newly started prototype thread: a sanctified chassis wakes in a scrapyard chapel and begins rejecting the saint-image the mechanics tried to install into it.",
    status: "ONGOING" as const,
    format: "SOLO" as const,
    joinPolicy: "PRIVATE" as const,
    visibility: "STANDARD" as const,
    searchVisibility: "PUBLIC" as const,
    allowDiscovery: true,
    tags: ["cyberpunk", "dark", "solo-focus"],
    createdAt: "2026-03-26T20:00:00.000Z",
    chapters: [
      {
        title: "Boot Sequence Under Incense Smoke",
        publishedAt: "2026-03-26T20:10:00.000Z",
        posts: [
          {
            author: "howldaemon",
            createdAt: "2026-03-26T20:10:00.000Z",
            html:
              "<p>I woke to incense, welding sparks and a prayer file that kept failing checksum.</p>",
          },
          {
            author: "howldaemon",
            createdAt: "2026-03-26T20:18:00.000Z",
            html:
              "<p>The mechanics wanted a saint. What they built instead is asking why saints are always nailed into place.</p>",
          },
        ],
      },
    ],
  },
] as const;

function toHtml(raw: string) {
  return raw.trim().startsWith("<") ? raw : `<p>${raw}</p>`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function ensureFixtureUsers() {
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);

  const users = new Map<string, { id: string; username: string }>();

  for (const fixture of FIXTURE_USERS) {
    const user = await prisma.user.upsert({
      where: { email: fixture.email },
      update: {
        username: fixture.username,
        hashedPassword: passwordHash,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        profile: {
          upsert: {
            update: {
              displayName: fixture.displayName,
              bio: fixture.bio,
            },
            create: {
              displayName: fixture.displayName,
              bio: fixture.bio,
            },
          },
        },
        wallet: {
          upsert: {
            update: {
              reputationBudget: 50,
              reputationBudgetMax: 50,
              reputationTotal: 25,
            },
            create: {
              reputationBudget: 50,
              reputationBudgetMax: 50,
              reputationTotal: 25,
            },
          },
        },
      },
      create: {
        email: fixture.email,
        username: fixture.username,
        hashedPassword: passwordHash,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        profile: {
          create: {
            displayName: fixture.displayName,
            bio: fixture.bio,
          },
        },
        wallet: {
          create: {
            reputationBudget: 50,
            reputationBudgetMax: 50,
            reputationTotal: 25,
          },
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    users.set(user.username, user);
  }

  return users;
}

async function wipeFixtureBooks(ownerIds: string[]) {
  const arcs = await prisma.arc.findMany({
    where: { ownerId: { in: ownerIds } },
    select: { id: true },
  });

  const arcIds = arcs.map((arc) => arc.id);
  if (arcIds.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.arcFollow.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.collaborator.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.turnQueue.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.arcTag.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.arcReadState.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.arcMetrics.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.arcSearchDocument.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.chapter.deleteMany({ where: { arcId: { in: arcIds } } });
    await tx.arc.deleteMany({ where: { id: { in: arcIds } } });
  });
}

async function createFixtureBooks(users: Map<string, { id: string; username: string }>) {
  const createdBooks: Array<{ id: string; slug: string }> = [];

  for (const fixture of FIXTURE_BOOKS) {
    const owner = users.get(fixture.owner);
    if (!owner) throw new Error(`Missing owner user ${fixture.owner}`);

    const slug = slugify(fixture.title) || `arc-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date(fixture.createdAt);

    const book = await prisma.arc.create({
      data: {
        ownerId: owner.id,
        title: fixture.title,
        slug,
        publicSlug: slug,
        tagline: fixture.tagline,
        hook: fixture.hook,
        summary: fixture.summary,
        status: fixture.status,
        type: fixture.format === "SOLO" ? "SOLO" : "COOP",
        format: fixture.format,
        joinPolicy: fixture.joinPolicy,
        visibility: fixture.visibility,
        searchVisibility: fixture.searchVisibility,
        allowDiscovery: fixture.allowDiscovery,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true, slug: true },
    });

    createdBooks.push(book);

	    for (const tagSlug of fixture.tags) {
	      const tag = await prisma.tag.upsert({
	        where: { slug: tagSlug },
	        update: {},
	        create: {
	          slug: tagSlug,
	          name: tagSlug
	            .split("-")
	            .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
	            .join(" "),
	        },
	        select: { id: true },
	      });

	      await prisma.arcTag.create({
	        data: {
	          arcId: book.id,
	          tagId: tag.id,
	        },
	      });
	    }

    const participantUsernames = new Set<string>([fixture.owner]);
    for (const chapter of fixture.chapters) {
      for (const post of chapter.posts) participantUsernames.add(post.author);
    }

    for (const username of participantUsernames) {
      if (username === fixture.owner) continue;
      const user = users.get(username);
      if (!user) continue;

	      const existingCollaborator = await prisma.collaborator.findFirst({
	        where: {
	          userId: user.id,
	          arcId: book.id,
	          pageId: null,
	        },
	        select: { id: true },
	      });

	      if (existingCollaborator) {
	        await prisma.collaborator.update({
	          where: { id: existingCollaborator.id },
	          data: { role: fixture.format === "DUO" ? "AUTHOR" : "EDITOR" },
	        });
	      } else {
	        await prisma.collaborator.create({
	          data: {
	            userId: user.id,
	            arcId: book.id,
	            pageId: null,
	            role: fixture.format === "DUO" ? "AUTHOR" : "EDITOR",
	          },
	        });
	      }
	    }

    const createdPosts: Array<{ id: string; authorId: string; createdAt: Date }> = [];

    for (const [chapterIndex, chapterFixture] of fixture.chapters.entries()) {
      const author = users.get(chapterFixture.posts[0]?.author ?? fixture.owner);
      const publishedAt = new Date(chapterFixture.publishedAt);

      const chapter = await prisma.chapter.create({
        data: {
          arcId: book.id,
          index: chapterIndex + 1,
          title: chapterFixture.title,
          content: { type: "markdown", value: chapterFixture.title },
          markdown: chapterFixture.title,
          contentHtml: `<p>${chapterFixture.title}</p>`,
          isDraft: false,
          publishedAt,
          publishRole: author?.id === owner.id ? "OWNER" : "AUTHOR",
          authorId: author?.id ?? owner.id,
          status: chapterIndex === fixture.chapters.length - 1 ? "OPEN" : "CLOSED",
          completedAt:
            fixture.status === "FINISHED" && chapterIndex === fixture.chapters.length - 1
              ? addMinutes(publishedAt, 90)
              : null,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        },
        select: { id: true },
      });

      let lastPostAt: Date | null = null;

      for (const postFixture of chapterFixture.posts) {
        const authorUser = users.get(postFixture.author);
        if (!authorUser) throw new Error(`Missing post author ${postFixture.author}`);
        const createdAtPost = new Date(postFixture.createdAt);

        const post = await prisma.chapterPost.create({
          data: {
            chapterId: chapter.id,
            authorId: authorUser.id,
            contentMd: postFixture.html,
            contentHtml: toHtml(postFixture.html),
            createdAt: createdAtPost,
          },
          select: { id: true, authorId: true, createdAt: true },
        });

        createdPosts.push(post);
        lastPostAt = createdAtPost;
      }

      await prisma.chapter.update({
        where: { id: chapter.id },
        data: {
          lastPostAt,
          updatedAt: lastPostAt ?? publishedAt,
        },
      });
    }

    const bookUpdatedAt =
      createdPosts.at(-1)?.createdAt ?? createdAt;

    await prisma.arc.update({
      where: { id: book.id },
      data: { updatedAt: bookUpdatedAt },
    });

    const followerUsernames = [...users.keys()].filter((username) => username !== fixture.owner);
    for (const [index, username] of followerUsernames.entries()) {
      const follower = users.get(username);
      if (!follower) continue;
      await prisma.arcFollow.upsert({
        where: {
          userId_arcId: {
            userId: follower.id,
            arcId: book.id,
          },
        },
        update: {},
        create: {
          userId: follower.id,
          arcId: book.id,
          createdAt: addMinutes(bookUpdatedAt, index + 1),
        },
      });
    }

    const likePairs = createdPosts.slice(0, Math.min(6, createdPosts.length));
    for (const [index, post] of likePairs.entries()) {
      const liker = [...users.values()].find((user) => user.id !== post.authorId);
      if (!liker) continue;

      await prisma.chapterPostLike.create({
        data: {
          userId: liker.id,
          postId: post.id,
          createdAt: addMinutes(post.createdAt, index + 2),
        },
      }).catch(() => null);
    }

    for (const post of createdPosts.slice(0, Math.min(4, createdPosts.length))) {
      const giver = [...users.values()].find((user) => user.id !== post.authorId);
      if (!giver) continue;

      await prisma.chapterPostReputationGrant.create({
        data: {
          fromUserId: giver.id,
          toUserId: post.authorId,
          postId: post.id,
          amount: 1,
          createdAt: addMinutes(post.createdAt, 12),
        },
      }).catch(() => null);
    }
  }

  const [firstBook, secondBook] = createdBooks;
  const blackRelay = users.get("blackrelay");
  const howldaemon = users.get("howldaemon");

  if (firstBook && blackRelay) {
    await prisma.arcReadState.upsert({
      where: {
        userId_arcId: {
          userId: blackRelay.id,
          arcId: firstBook.id,
        },
      },
      update: {
        lastVisitedAt: new Date("2026-03-27T12:15:00.000Z"),
      },
      create: {
        userId: blackRelay.id,
        arcId: firstBook.id,
        lastVisitedAt: new Date("2026-03-27T12:15:00.000Z"),
      },
    });
  }

  if (secondBook && howldaemon) {
    await prisma.arcReadState.upsert({
      where: {
        userId_arcId: {
          userId: howldaemon.id,
          arcId: secondBook.id,
        },
      },
      update: {
        lastVisitedAt: new Date("2026-03-27T12:35:00.000Z"),
      },
      create: {
        userId: howldaemon.id,
        arcId: secondBook.id,
        lastVisitedAt: new Date("2026-03-27T12:35:00.000Z"),
      },
    });
  }

  return createdBooks.length;
}

async function main() {
  const users = await ensureFixtureUsers();
  await wipeFixtureBooks([...users.values()].map((user) => user.id));
  const booksCount = await createFixtureBooks(users);
  await rebuildAllArcDiscoveryFoundation(prisma);

  console.log("");
  console.log(`Seeded ${FIXTURE_USERS.length} fixture account(s) and ${booksCount} arc(s).`);
  console.log(`Fixture password: ${FIXTURE_PASSWORD}`);
  console.log("Accounts:");
  for (const fixture of FIXTURE_USERS) {
    console.log(`- @${fixture.username} <${fixture.email}>`);
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed ARCS fixtures", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
