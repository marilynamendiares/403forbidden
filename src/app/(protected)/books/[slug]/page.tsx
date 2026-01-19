// src/app/books/[slug]/page.tsx

// ===== Imports =================================================================
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import ChaptersLiveClient from "@/components/ChaptersLiveClient"; // ← NEW: realtime списка глав
import { getBookBySlug, getFollowStatus } from "@/server/follow";
import { FollowBookButton } from "@/components/follow/FollowBookButton";
import CollapsibleSection from "@/components/CollapsibleSection";
import { BookActionsMenu } from "@/components/book/BookActionsMenu";


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

    revalidatePath("/books");
    redirect("/books");
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

    revalidatePath(`/books/${slug}`);
  }

  // -- Create chapter ------------------------------------------------------------
  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "");
    const content = String(formData.get("content") || "");
    const publish = formData.get("publish") === "on";

    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books/${slug}/chapters`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title, content, publish }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to create chapter (${res.status}): ${txt}`);
    }

    revalidatePath(`/books/${slug}`);
  }

  // ===== Render (JSX) ===========================================================
  return (
    <div className="space-y-6">
      {/* -- Breadcrumb ----------------------------------------------------------- */}
<Link className="text-sm opacity-70 hover:underline" href="/books">
  ← Back to books
</Link>

      {/* -- Header + Actions ---------------------------------------------------- */}
      <div className="flex items-center justify-between">
        {/* Левая часть: заголовок + роль + created by */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{book.title}</h1>

            {(meRole === "OWNER" || meRole === "EDITOR") && (
              <span
                className={
                  "rounded-full border px-2 py-0.5 text-xs " +
                  (meRole === "OWNER"
                    ? "border-amber-700 text-amber-400"
                    : "border-blue-700 text-blue-400")
                }
                title={meRole === "OWNER" ? "You are the owner" : "You are an editor"}
              >
                {meRole.toLowerCase()}
              </span>
            )}
          </div>

          {collabData?.owner && (
            <p className="opacity-60 text-sm mt-1">
              created by{" "}
              <b>
                @
                {collabData.owner.username ??
                  collabData.owner.email ??
                  "owner"}
              </b>
            </p>
          )}
        </div>

        {/* Правая часть — Follow bell + троеточие */}
        <div className="flex items-center gap-2">
          {bookMeta && (
            <FollowBookButton
              slug={slug}
              initialFollowed={followInitial.followed}
              initialCount={followInitial.count}
            />
          )}

          <BookActionsMenu
            canDelete={meRole === "OWNER"}   // только владелец видит пункт Delete
            deleteAction={deleteBook}        // server action из файла
          />
        </div>
      </div>

      {/* ===== Narrow body (Chapters + Create + Collaborators) =================== */}
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_360px] items-start">
          {/* LEFT: Chapters + Create */}
          <div className="space-y-6">
            {/* -- Chapters list -------------------------------------------------------- */}
            <section>
              <h2 className="text-lg font-medium mb-2">Chapters</h2>

              {/* keep current TOC width, but align to left edge */}
              <div className="w-full max-w-xl">
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
                            "flex items-baseline justify-between",
                            "py-2",
                            isDraft ? "text-neutral-500" : "text-white",
                          ].join(" ")}
                        >
                          <div className="flex items-baseline gap-4 min-w-0 flex-1">
                            <span className="w-10 font-mono text-xs tracking-[0.18em] tabular-nums opacity-80">
                              {idx}
                            </span>

                            <Link
                              href={`/books/${slug}/${c.index}`}
                              className={[
                                "min-w-0",
                                "truncate",
                                "text-base font-medium",
                                "hover:underline",
                                isDraft ? "hover:text-neutral-300" : "",
                              ].join(" ")}
                              title={c.title}
                            >
                              {c.title}
                            </Link>
                          </div>

                          <span className="w-10 text-right font-mono text-xs tracking-[0.18em] tabular-nums opacity-70">
                            {postsCount}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {/* -- Create chapter (only OWNER/EDITOR) ---------------------------------- */}
            {canEditBook && (
              <div className="w-full max-w-xl">
                <CollapsibleSection label="Create chapter">
                  <form action={create} className="space-y-2">
                    <input
                      name="title"
                      placeholder="Title"
                      className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
                      required
                    />
                    <textarea
                      name="content"
                      placeholder="Markdown content…"
                      className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
                      rows={8}
                      required
                    />
                    <label className="flex items-center gap-2 text-sm opacity-80">
                      <input type="checkbox" name="publish" /> Publish immediately
                    </label>
                    <button className="rounded bg-white text-black px-4 py-2">
                      Create
                    </button>
                    <p className="opacity-60 text-xs">Requires sign-in.</p>
                  </form>
                </CollapsibleSection>
              </div>
            )}
          </div>

          {/* RIGHT: Collaborators */}
          <aside className="space-y-6">
            <section className="border border-neutral-800 rounded-xl p-4 space-y-3">
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
                            revalidatePath(`/books/${slug}`);
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
                      revalidatePath(`/books/${slug}`);
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
          </aside>
        </div>

        {/* keep SSE subscriber (can stay anywhere on page) */}
        <ChaptersLiveClient slug={slug} />
      </div>
      {/* ===== End narrow body =================================================== */}
    </div>
  );
}
