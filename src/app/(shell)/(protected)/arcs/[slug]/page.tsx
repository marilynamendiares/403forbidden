// src/app/arcs/[slug]/page.tsx

// ===== Imports =================================================================
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getArcViewerAccess } from "@/server/arcs/access";
import ChaptersLiveClient from "@/features/chapters/ui/ChaptersLiveClient";
import { getArcBySlug, getArcFollowStatus } from "@/server/follow";
import { FollowArcButton } from "@/components/follow/FollowArcButton";
import CollapsibleSection from "@/components/CollapsibleSection";
import { DeleteArcControl } from "@/components/arc/DeleteArcControl";
import { ArcIntroClient } from "@/components/arc/ArcIntroClient";
import { ArcMetadataEditor } from "@/components/arc/ArcMetadataEditor";
import { StickyCenterRail } from "@/components/layout/StickyCenterRail";
import { StickyRightRail } from "@/components/layout/StickyRightRail";
import ShellScrollModeSetter from "@/app/shell/ShellScrollMode";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import ShellSurfaceSetter from "@/app/shell/ShellSurface";
import ReadStateTracker from "@/components/arcs/ReadStateTracker";
import { getSessionViewer, requireSessionUserId } from "@/server/session";
import { listChaptersForViewer } from "@/server/services/chapters";
import { createChapterForUser } from "@/server/services/chapters";
import {
  addArcCollaboratorForOwner,
  deleteArcForUser,
  getArcPageCollaborators,
  removeArcCollaboratorForOwner,
  updateArcForUser,
} from "@/server/services/arcs";


// ===== Next.js runtime =========================================================
export const dynamic = "force-dynamic";

// ===== Types ===================================================================
type ArcChapterListItem = {
  id: string;
  index: number;
  title: string;
  publishedAt: string | null;
  _count?: { posts?: number };
  postsCount?: number;
  postCount?: number;
};

type ArcChapters = { arc: { id: string; title: string; ownerId: string }; chapters: ArcChapterListItem[] };

type CollaboratorsPayload = {
  arc: { id: string; slug: string; title: string; ownerId: string };
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
    role: "OWNER" | "EDITOR" | "AUTHOR" | "VIEWER";
  }>;
} | null;

function getPostsCountLabel(chapter: ArcChapterListItem) {
  const postsCountRaw =
    (chapter._count?.posts as number | undefined) ??
    (chapter.postsCount as number | undefined) ??
    (chapter.postCount as number | undefined);

  return typeof postsCountRaw === "number"
    ? String(postsCountRaw).padStart(2, "0")
    : "--";
}


// ===== Data loaders ============================================================
async function getArc(slug: string, viewerId: string | null): Promise<ArcChapters> {
  const result = await listChaptersForViewer({ slug, viewerId });
  if (!result) {
    return {
      arc: { id: "", title: slug.replace(/-/g, " "), ownerId: "" },
      chapters: [],
    };
  }

  return {
    arc: result.arc,
    chapters: result.chapters as ArcChapterListItem[],
  };
}

async function getCollaborators(_arcId: string, slug: string, viewerId: string | null): Promise<CollaboratorsPayload> {
  return (await getArcPageCollaborators({
    viewerUserId: viewerId,
    slug,
  })) as CollaboratorsPayload;
}

// ===== Page ====================================================================
export default async function ArcPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // ----- Params ----------------------------------------------------------------
  const { slug } = await params;

  // ----- Auth session (to derive role correctly) --------------------------------
  const { userId: me } = await getSessionViewer();

  // ----- Arc meta for follow button (id needed) ---------------------------------
  const arcMeta = await getArcBySlug(slug); // может быть null, если арка не найдена
  if (!arcMeta) notFound();

  const access = await getArcViewerAccess({ viewerId: me, arc: arcMeta });
  if (!access.canRead) notFound();

  const followInitial =
    arcMeta ? await getArcFollowStatus(me, arcMeta.id) : { followed: false, count: 0 };


  // ----- Fetch data -------------------------------------------------------------
  const [{ arc, chapters }, collabData] = await Promise.all([
    getArc(slug, me),
    getCollaborators(arcMeta.id, slug, me),
  ]);
  const arcInfo = arc ?? { title: slug.replace(/-/g, " ") };

  // ----- Role resolution (OWNER / EDITOR / VIEWER) ------------------------------
  let meRole: "OWNER" | "EDITOR" | "AUTHOR" | "VIEWER" | null = null;
  if (me && collabData) {
    if (collabData.owner?.id === me) {
      meRole = "OWNER";
    } else {
      const mine = collabData.collaborators.find((c) => c.user.id === me);
      meRole = mine?.role ?? null;
    }
  }
  const canEditArcIntro = meRole === "OWNER";
  const canManageArc = meRole === "OWNER" || meRole === "EDITOR";
  const canManageCollaborators = meRole === "OWNER";
  const canDeleteArc = meRole === "OWNER";

  // ===== Server Actions =========================================================

  // -- Delete arc ----------------------------------------------------------------
  async function deleteArc() {
    "use server";
    const userId = await requireSessionUserId();
    const deleted = await deleteArcForUser({ userId, slug });
    if (!deleted) {
      throw new Error("Failed to delete arc");
    }

    revalidatePath("/arcs");
    redirect("/arcs");
  }

  // -- Create chapter ------------------------------------------------------------
  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "");
    const userId = await requireSessionUserId();
    await createChapterForUser({
      slug,
      userId,
      title,
      content: " ",
      publish: false,
    });

    revalidatePath(`/arcs/${slug}`);
  }

  async function saveArcIntro(formData: FormData) {
    "use server";
    const intro = String(formData.get("content") ?? "");
    const userId = await requireSessionUserId();
    await updateArcForUser({ userId, slug, intro });

    revalidatePath(`/arcs/${slug}`);
  }

  async function saveArcMetadata(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const tagline = String(formData.get("tagline") ?? "").trim();
    const hook = String(formData.get("hook") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();
    const format = String(formData.get("format") ?? "").trim();
    const joinPolicy = String(formData.get("joinPolicy") ?? "").trim();
    const visibility = String(formData.get("visibility") ?? "").trim();
    const searchVisibility = String(formData.get("searchVisibility") ?? "").trim();
    const allowDiscovery = formData.get("allowDiscovery") === "on";
    const tags = formData
      .getAll("tags")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const userId = await requireSessionUserId();

    await updateArcForUser({
      userId,
      slug,
      title,
      tagline: tagline || null,
      hook: hook || null,
      summary: summary || null,
      status: status as Parameters<typeof updateArcForUser>[0]["status"],
      format: format as Parameters<typeof updateArcForUser>[0]["format"],
      joinPolicy: joinPolicy as Parameters<typeof updateArcForUser>[0]["joinPolicy"],
      visibility: visibility as Parameters<typeof updateArcForUser>[0]["visibility"],
      searchVisibility: searchVisibility as Parameters<typeof updateArcForUser>[0]["searchVisibility"],
      allowDiscovery,
      tags,
    });

    revalidatePath(`/arcs/${slug}`);
    revalidatePath("/arcs");
  }

  async function removeCollaborator(collaboratorUserId: string) {
    "use server";
    const userId = await requireSessionUserId();
    await removeArcCollaboratorForOwner({
      ownerUserId: userId,
      slug,
      collaboratorUserId,
    });
    revalidatePath(`/arcs/${slug}`);
  }

  async function addCollaborator(formData: FormData) {
    "use server";
    const identifier = String(formData.get("identifier") || "");
    const role = String(formData.get("role") || "EDITOR") as "EDITOR" | "VIEWER";
    const userId = await requireSessionUserId();
    await addArcCollaboratorForOwner({
      ownerUserId: userId,
      slug,
      identifier,
      role,
    });
    revalidatePath(`/arcs/${slug}`);
  }

  // ===== Render (JSX) ===========================================================
  return (
    <div className="relative h-full min-h-0 overflow-hidden text-[#2D2D2D]">
      {me && arcMeta ? <ReadStateTracker arcId={arcMeta.id} /> : null}
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
              {arcInfo.title}
            </span>
          }
        >
          <div className="flex flex-col gap-[30px]">
            <h1
              data-sticky-title
              className="text-[36px] leading-none font-bold text-[#2D2D2D]"
            >
              {arcInfo.title}
            </h1>

            <ArcIntroClient
              arcId={arcMeta?.id ?? slug}
              canEdit={canEditArcIntro}
              defaultContent={arcMeta?.introHtml ?? ""}
              onSave={saveArcIntro}
            />
          </div>
        </StickyCenterRail>

        <aside className="h-full min-h-0 min-w-0">
          <StickyRightRail
            sticky={
              arcMeta ? (
                <FollowArcButton
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

                {chapters.map((c) => {
                  const isDraft = !c.publishedAt;
                  const idx = String(c.index ?? 0).padStart(2, "0");
                  const postsCount = getPostsCountLabel(c);

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

              {canManageArc && (
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

            {canManageArc && arcMeta ? (
              <ArcMetadataEditor
                action={saveArcMetadata}
                initial={{
                  title: arcMeta.title,
                  tagline: arcMeta.tagline ?? null,
                  hook: arcMeta.hook ?? null,
                  summary: arcMeta.summary ?? null,
                  status: arcMeta.status,
                  format: arcMeta.format,
                  joinPolicy: arcMeta.joinPolicy,
                  visibility: arcMeta.visibility,
                  searchVisibility: arcMeta.searchVisibility,
                  allowDiscovery: arcMeta.allowDiscovery,
                  tags: arcMeta.tags.map((entry) => entry.tag.slug),
                }}
              />
            ) : null}

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

                        {canManageCollaborators ? (
                          <form action={removeCollaborator.bind(null, c.user.id)}>
                            <button className="text-xs underline opacity-70 hover:opacity-100">
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </li>
                    ))}

                    {collabData.collaborators.length === 0 && (
                      <li className="opacity-60 text-sm">
                        No collaborators yet.
                      </li>
                    )}
                  </ul>

                  {canManageCollaborators ? (
                    <form action={addCollaborator} className="flex items-center gap-2 pt-2">
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
                  ) : null}
                </>
              )}

              <p className="opacity-60 text-xs">
                Управление доступом доступно только владельцу арки.
              </p>
            </section>

            {canDeleteArc && (
              <div className="mt-6 flex justify-end">
                <DeleteArcControl action={deleteArc} />
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
