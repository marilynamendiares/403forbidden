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

// ===== Next.js runtime =========================================================
export const dynamic = "force-dynamic";

// ===== Types ===================================================================
type BookChapters = { book: { title: string }; chapters: any[] };

type CollaboratorsPayload = {
  book: { id: string; slug: string; title: string; ownerId: string };
  owner: {
    id: string;
    email: string | null;
    profile: { username: string | null; displayName: string | null } | null;
  } | null;
  collaborators: Array<{
    user: {
      id: string;
      email: string | null;
      profile: { username: string | null; displayName: string | null } | null;
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
      <a className="text-sm opacity-70 hover:underline" href="/books">
        ← Back to books
      </a>

      {/* -- Header + Delete book ------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
  <h1 className="text-2xl font-semibold">{book.title}</h1>

  {/* FOLLOW button (скрываем, если не нашли мету книги) */}
  {bookMeta && (
    <FollowBookButton
      slug={slug}
      initialFollowed={followInitial.followed}
      initialCount={followInitial.count}
    />
  )}

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


        {canEditBook && (
          <form action={deleteBook}>
            <button
              className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:bg-red-50/10 disabled:opacity-50"
              title="Delete book"
            >
              Delete book
            </button>
          </form>
        )}
      </div>

      {/* -- Chapters list -------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-medium mb-2">Chapters</h2>
        <ul className="grid gap-3">
          {chapters.length === 0 && <p className="opacity-60">No chapters yet.</p>}

          {chapters.map((c: any) => {
            const isDraft = !c.publishedAt;
            return (
              <li
                key={c.id}
                className={
                  "rounded-xl border p-4 " +
                  (isDraft
                    ? "border-neutral-800 bg-neutral-950/40 opacity-90"
                    : "border-neutral-800")
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={"text-sm " + (isDraft ? "opacity-50" : "opacity-70")}>
                      #{c.index}
                    </p>
                    <Link
                      href={`/books/${slug}/${c.index}`}
                      className={
                        "text-base font-medium hover:underline " +
                        (isDraft ? "text-neutral-300" : "")
                      }
                    >
                      {c.title}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "text-xs px-2 py-1 rounded border " +
                        (isDraft
                          ? "border-neutral-800 text-neutral-400"
                          : "border-neutral-700")
                      }
                    >
                      {isDraft ? "draft" : "published"}
                    </span>

                    {canEditBook && isDraft && (
                      <form action={publishChapter}>
                        <input type="hidden" name="index" value={c.index} />
                        <button
                          className="rounded-xl border border-neutral-700 px-3 py-2 text-xs hover:bg-emerald-50/10"
                          title="Publish chapter"
                        >
                          Publish
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* -- Create chapter ------------------------------------------------------- */}
      <form action={create} className="border border-neutral-800 rounded-xl p-4 space-y-2">
        <h2 className="text-lg font-medium">Create chapter</h2>
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
        <button className="rounded bg-white text-black px-4 py-2">Create</button>
        <p className="opacity-60 text-xs">Requires sign-in.</p>
      </form>

      {/* -- Collaboration -------------------------------------------------------- */}
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
                  collabData.owner?.profile?.username ??
                  collabData.owner?.email ??
                  "owner"}
              </li>

              {collabData.collaborators.map((c) => (
                <li key={c.user.id} className="text-sm flex items-center gap-2">
                  <span className="opacity-80">
                    {c.user.profile?.displayName ??
                      c.user.profile?.username ??
                      c.user.email}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded border border-neutral-700">
                    {c.role.toLowerCase()}
                  </span>

                  {/* Remove collaborator */}
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
                <li className="opacity-60 text-sm">No collaborators yet.</li>
              )}
            </ul>

            {/* Add collaborator */}
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
                className="w-64 rounded bg-transparent border border-neutral-700 px-3 py-2 text-sm"
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
              <button className="rounded bg-white text-black px-3 py-2 text-sm">Add</button>
            </form>
          </>
        )}

        <p className="opacity-60 text-xs">
          Управление доступом доступно только владельцу книги.
        </p>
      </section>

      {/* ===== Realtime (SSE) — invisible subscriber for chapters list ============ */}
      <ChaptersLiveClient slug={slug} />
      {/* ===== End Realtime ====================================================== */}
    </div>
  );
}
