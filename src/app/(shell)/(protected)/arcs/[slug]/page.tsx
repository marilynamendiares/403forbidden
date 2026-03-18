// src/app/arcs/[slug]/page.tsx

// ===== Imports =================================================================
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import ChaptersLiveClient from "@/features/chapters/ui/ChaptersLiveClient";
import { getBookBySlug, getFollowStatus } from "@/server/follow";
import { FollowBookButton } from "@/components/follow/FollowBookButton";
import CollapsibleSection from "@/components/CollapsibleSection";
import { DeleteBookControl } from "@/components/book/DeleteBookControl";
import { BookIntroClient } from "@/components/book/BookIntroClient";
import { StickyCenterRail } from "@/components/layout/StickyCenterRail";
import { StickyRightRail } from "@/components/layout/StickyRightRail";
import ShellScrollModeSetter from "@/app/shell/ShellScrollMode";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import ShellSurfaceSetter from "@/app/shell/ShellSurface";


// ===== Next.js runtime =========================================================
export const dynamic = "force-dynamic";

// ===== Types ===================================================================
type BookChapters = { book: { title: string }; chapters: any[] };

type CollaboratorsPayload = {
  book: { id: string; slug: string; title: string; ownerId: string };
  owner: {
    id: string;
    email: string | null;
    username: string | null;
    profile: { displayName: string | null; avatarUrl: string | null } | null;
  } | null;
  collaborators: Array<{
    user: {
      id: string;
      email: string | null;
      username: string | null;
      profile: { displayName: string | null; avatarUrl: string | null } | null;
    };
    role: "EDITOR" | "VIEWER";
  }>;
} | null;


// ===== Data loaders (SSR fetch with cookies) ===================================
async function getBook(slug: string): Promise<BookChapters> {
  const h = await headers();
  const origin =
    h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const cookie = (await cookies()).toString();

  const res = await fetch(`${origin}/api/books/${slug}/chapters`, {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });

  if (!res.ok) {
    return { book: { title: slug.replace(/-/g, " ") }, chapters: [] };
  }
  return (await res.json()) as BookChapters;
}

async function getCollaborators(slug: string): Promise<CollaboratorsPayload> {
  const h = await headers();
  const origin =
    h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const cookie = (await cookies()).toString();

  const res = await fetch(`${origin}/api/books/${slug}/collaborators`, {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

// ===== Page ====================================================================
export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // ----- Params ----------------------------------------------------------------
  const { slug } = await params;

  // ----- Auth session (to derive role correctly) --------------------------------
  const session = await getServerSession(authOptions);
  const me = session?.user?.id ?? null;

  // ----- Book meta for follow button (id needed) --------------------------------
const bookMeta = await getBookBySlug(slug); // может быть null, если книга не найдена
const followInitial =
  bookMeta ? await getFollowStatus(me, bookMeta.id) : { followed: false, count: 0 };


  // ----- Fetch data -------------------------------------------------------------
  const [{ book, chapters }, collabData] = await Promise.all([
    getBook(slug),
    getCollaborators(slug),
  ]);

  // ----- Role resolution (OWNER / EDITOR / VIEWER) ------------------------------
  let meRole: "OWNER" | "EDITOR" | "VIEWER" | null = null;
  if (me && collabData) {
    if (collabData.owner?.id === me) {
      meRole = "OWNER";
    } else {
      const mine = collabData.collaborators.find((c) => c.user.id === me);
      meRole = mine?.role ?? null;
    }
  }
  const canEditBook = meRole === "OWNER" || meRole === "EDITOR"; // only OWNER/EDITOR

  // ===== Server Actions =========================================================

  // -- Delete book ---------------------------------------------------------------
  async function deleteBook() {
    "use server";
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books/${slug}`, {
      method: "DELETE",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to delete book (${res.status}): ${txt}`);
    }

    revalidatePath("/arcs");
    redirect("/arcs");
  }

  // -- Publish chapter (from list) ----------------------------------------------
  async function publishChapter(formData: FormData) {
    "use server";
    const index = Number(formData.get("index"));
    if (!Number.isFinite(index) || index < 1) {
      throw new Error("Bad chapter index");
    }

    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books/${slug}/${index}/publish`, {
      method: "POST",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to publish chapter (${res.status}): ${txt}`);
    }

    revalidatePath(`/arcs/${slug}`);
  }

  // -- Create chapter ------------------------------------------------------------
  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "");

    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books/${slug}/chapters`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title, content: "", publish: false }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to create chapter (${res.status}): ${txt}`);
    }

    revalidatePath(`/arcs/${slug}`);
  }

  async function saveBookIntro(formData: FormData) {
    "use server";
    const intro = String(formData.get("content") ?? "");
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ intro }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to update book intro (${res.status}): ${txt}`);
    }

    revalidatePath(`/arcs/${slug}`);
  }

  // ===== Render (JSX) ===========================================================
  return (
    <div className="relative h-full min-h-0 overflow-hidden text-[#2D2D2D]">
      <ShellScrollModeSetter mode="split" />
      <ShellVariantSetter variant="full" />
      <ShellSurfaceSetter surface="light" />

      {/* ===== Intro + Rails ===================================================== */}
      <div
        className="grid h-full min-h-0 gap-0 overflow-hidden"
        style={{ gridTemplateColumns: "minmax(0, 1fr) var(--right-rail-w)" }}
      >
        <StickyCenterRail
          breadcrumb={
            <div className="header-font-archimoto inline-flex w-fit items-center gap-1 text-[15px] font-thin leading-none uppercase text-[#666666]">
              <span>/</span>
              <Link href="/arcs" className="transition-colors hover:text-[#2D2D2D]">
                ARCS
              </Link>
              <span>/</span>
            </div>
          }
          stickySuffix={
            <span className="header-font-archimoto text-[15px] font-thin leading-none uppercase text-[#666666]">
              {book.title}
            </span>
          }
        >
          <div className="flex flex-col gap-[30px]">
            <h1
              data-sticky-title
              className="text-[36px] leading-none font-bold text-[#2D2D2D]"
            >
              {book.title}
            </h1>

            <BookIntroClient
              bookId={bookMeta?.id ?? slug}
              canEdit={canEditBook}
              defaultContent={bookMeta?.introHtml ?? ""}
              onSave={saveBookIntro}
            />
          </div>
        </StickyCenterRail>

        <aside className="h-full min-h-0 min-w-0">
          <StickyRightRail
            sticky={
              bookMeta ? (
                <FollowBookButton
                  slug={slug}
                  initialFollowed={followInitial.followed}
                  initialCount={followInitial.count}
                />
              ) : (
                <span />
              )
            }
          >
            <div className="space-y-0">
            <div className="h-[6px] w-12 bg-[#2D2D2D]" aria-hidden="true" />

            <section className="pt-[54px]">
              <h2 className="mb-8 text-[24px] font-bold leading-none">Chapters</h2>

              <ul className="space-y-1">
                {chapters.length === 0 && (
                  <p className="opacity-60">No chapters yet.</p>
                )}

                {chapters.map((c: any) => {
                  const isDraft = !c.publishedAt;
                  const idx = String(c.index ?? 0).padStart(2, "0");

                  const postsCountRaw =
                    (c._count?.posts as number | undefined) ??
                    (c.postsCount as number | undefined) ??
                    (c.postCount as number | undefined);

                  const postsCount =
                    typeof postsCountRaw === "number"
                      ? String(postsCountRaw).padStart(2, "0")
                      : "--";

                  return (
                    <li key={c.id}>
                      <div
                        className={[
                          "flex items-baseline justify-between py-2",
                          isDraft ? "text-neutral-500" : "text-[#2D2D2D]",
                        ].join(" ")}
                      >
                        <div className="flex min-w-0 flex-1 items-baseline gap-4">
                          <span className="header-font-archimoto w-10 text-xs font-thin tracking-[0.18em] tabular-nums opacity-80">
                            {idx}
                          </span>

                          <Link
                            href={`/arcs/${slug}/${c.index}`}
                            className={[
                              "min-w-0 truncate text-base font-medium hover:underline",
                              isDraft ? "hover:text-[#2D2D2D]" : "",
                            ].join(" ")}
                            title={c.title}
                          >
                            {c.title}
                          </Link>
                        </div>

                        <span className="header-font-archimoto w-10 text-right text-xs font-thin tracking-[0.18em] tabular-nums opacity-70">
                          {postsCount}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {canEditBook && (
                <CollapsibleSection
                  label="New Chapter"
                  buttonClassName="bg-transparent !text-[#2D2D2D] hover:bg-transparent"
                  panelClassName="bg-transparent"
                >
                  <form action={create} className="space-y-3">
                    <input
                      name="title"
                      placeholder="Enter chapter name"
                      className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2"
                      required
                    />
                    <button className="rounded border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5">
                      Create
                    </button>
                  </form>
                </CollapsibleSection>
              )}
            </section>

            {/* RIGHT: Collaborators */}
            <section className="mt-10 border border-neutral-800 rounded-xl p-4 space-y-3">
              <h2 className="text-lg font-medium">Collaborators</h2>

              {!collabData ? (
                <p className="opacity-60 text-sm">No access.</p>
              ) : (
                <>
                  <ul className="grid gap-2">
                    <li className="text-sm">
                      <span className="opacity-70">Owner:</span>{" "}
                      {collabData.owner?.profile?.displayName ??
                        collabData.owner?.username ??
                        collabData.owner?.email ??
                        "owner"}
                    </li>

                    {collabData.collaborators.map((c) => (
                      <li
                        key={c.user.id}
                        className="text-sm flex items-center gap-2"
                      >
                        <span className="opacity-80">
                          {c.user.profile?.displayName ??
                            c.user.username ??
                            c.user.email}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded border border-neutral-700">
                          {c.role.toLowerCase()}
                        </span>

                        <form
                          action={async () => {
                            "use server";
                            const cookie = (await cookies()).toString();
                            const h = await headers();
                            const origin =
                              h.get("origin") ??
                              `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
                            await fetch(`${origin}/api/books/${slug}/collaborators`, {
                              method: "DELETE",
                              headers: { "content-type": "application/json", cookie },
                              body: JSON.stringify({ userId: c.user.id }),
                              cache: "no-store",
                            });
                            revalidatePath(`/arcs/${slug}`);
                          }}
                        >
                          <button className="text-xs underline opacity-70 hover:opacity-100">
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}

                    {collabData.collaborators.length === 0 && (
                      <li className="opacity-60 text-sm">
                        No collaborators yet.
                      </li>
                    )}
                  </ul>

                  <form
                    action={async (fd: FormData) => {
                      "use server";
                      const identifier = String(fd.get("identifier") || "");
                      const role = String(fd.get("role") || "EDITOR");
                      const cookie = (await cookies()).toString();
                      const h = await headers();
                      const origin =
                        h.get("origin") ??
                        `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
                      await fetch(`${origin}/api/books/${slug}/collaborators`, {
                        method: "POST",
                        headers: { "content-type": "application/json", cookie },
                        body: JSON.stringify({ identifier, role }),
                        cache: "no-store",
                      });
                      revalidatePath(`/arcs/${slug}`);
                    }}
                    className="flex items-center gap-2 pt-2"
                  >
                    <input
                      name="identifier"
                      placeholder="email or @username"
                      className="w-full min-w-0 rounded bg-transparent border border-neutral-700 px-3 py-2 text-sm"
                      required
                    />
                    <select
                      name="role"
                      className="rounded bg-transparent border border-neutral-700 px-2 py-2 text-sm"
                      defaultValue="EDITOR"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button className="rounded bg-white text-black px-3 py-2 text-sm">
                      Add
                    </button>
                  </form>
                </>
              )}

              <p className="opacity-60 text-xs">
                Управление доступом доступно только владельцу книги.
              </p>
            </section>

            {meRole === "OWNER" && (
              <div className="mt-6 flex justify-end">
                <DeleteBookControl action={deleteBook} />
              </div>
            )}
            </div>
          </StickyRightRail>
        </aside>

        {/* keep SSE subscriber (can stay anywhere on page) */}
        <ChaptersLiveClient slug={slug} />
      </div>
    </div>
  );
}
