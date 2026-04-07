import Link from "next/link";
import { revalidatePath } from "next/cache";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import { listForumPostReportsForAdmin } from "@/server/services/adminControl";
import { getSessionViewer } from "@/server/session";
import { isAdminSession } from "@/server/admin";
import {
  dismissThreadPostReportsForAdmin,
  deleteThreadPostForUser,
  setThreadPostHiddenForAdmin,
} from "@/server/services/forum";

function formatDateTime(value: Date) {
  return value.toLocaleString();
}

function getPreviewText(value: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export default async function AdminReportsPage() {
  const reports = await listForumPostReportsForAdmin(100);

  async function hidePostAction(formData: FormData) {
    "use server";

    const postId = String(formData.get("postId") ?? "");
    if (!postId) {
      return;
    }

    const { session, userId } = await getSessionViewer();
    if (!userId || !isAdminSession(session)) {
      return;
    }

    await setThreadPostHiddenForAdmin({
      postId,
      userId,
      hidden: true,
      isAdmin: true,
    });
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
  }

  async function deletePostAction(formData: FormData) {
    "use server";

    const postId = String(formData.get("postId") ?? "");
    if (!postId) {
      return;
    }

    const { session, userId } = await getSessionViewer();
    if (!userId || !isAdminSession(session)) {
      return;
    }

    await deleteThreadPostForUser({
      postId,
      userId,
      isAdmin: true,
    });
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
  }

  async function dismissReportAction(formData: FormData) {
    "use server";

    const postId = String(formData.get("postId") ?? "");
    if (!postId) {
      return;
    }

    const { session, userId } = await getSessionViewer();
    if (!userId || !isAdminSession(session)) {
      return;
    }

    await dismissThreadPostReportsForAdmin({
      postId,
      userId,
      isAdmin: true,
    });
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
  }

  return (
    <AdminSectionCard
      eyebrow="Operational Feed"
      title="Reports Queue"
      subtitle="Moderation signal stream from forum users. Actions stay directly inside the queue so the operator does not need to context-switch for every report."
      contentClassName="space-y-3"
    >
      {reports.length === 0 ? (
        <div className="text-sm opacity-60">No reports yet.</div>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-neutral-900 bg-neutral-950/35 px-4 py-4">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="text-sm leading-6">
                    {report.reporter.profile?.displayName ?? `@${report.reporter.username}`} reported{" "}
                    <Link
                      href={`/forum/${report.post.thread.category.slug}/${report.post.thread.slug}#post-${report.post.id}`}
                      className="underline decoration-neutral-700 underline-offset-4 opacity-80 hover:opacity-100"
                    >
                      post {report.post.id.slice(0, 8)}
                    </Link>{" "}
                    in {report.post.thread.title}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    reporter: @{report.reporter.username} · category: {report.post.thread.category.title}
                    {report.post.hiddenAt ? " · hidden" : ""}
                    {report.post.deletedAt ? " · deleted" : ""}
                  </div>
                  {!report.post.hiddenAt && !report.post.deletedAt && report.post.markdown ? (
                    <div className="mt-3 text-sm leading-6 opacity-75">
                      <p className="line-clamp-2 break-words">{getPreviewText(report.post.markdown)}</p>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3 xl:w-[210px]">
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">{formatDateTime(report.createdAt)}</div>
                  <div className="flex flex-wrap gap-3 xl:flex-col">
                    <form action={dismissReportAction}>
                      <input type="hidden" name="postId" value={report.post.id} />
                      <button
                        type="submit"
                        className="w-full rounded-full border border-neutral-800 px-3 py-2 text-xs text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                      >
                        Dismiss report
                      </button>
                    </form>

                    {!report.post.hiddenAt && !report.post.deletedAt ? (
                      <form action={hidePostAction}>
                        <input type="hidden" name="postId" value={report.post.id} />
                        <button
                          type="submit"
                          className="w-full rounded-full border border-neutral-800 px-3 py-2 text-xs text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                        >
                          Hide post
                        </button>
                      </form>
                    ) : null}

                    {!report.post.deletedAt ? (
                      <form action={deletePostAction}>
                        <input type="hidden" name="postId" value={report.post.id} />
                        <button
                          type="submit"
                          className="w-full rounded-full border border-red-900/40 px-3 py-2 text-xs text-red-200 transition hover:border-red-800"
                        >
                          Delete post
                        </button>
                      </form>
                    ) : null}

                    <Link
                      href={`/forum/${report.post.thread.category.slug}/${report.post.thread.slug}#post-${report.post.id}`}
                      className="block w-full rounded-full border border-neutral-800 px-3 py-2 text-center text-xs text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                    >
                      Jump to thread
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminSectionCard>
  );
}
