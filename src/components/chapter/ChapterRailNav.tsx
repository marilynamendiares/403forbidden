"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CENTER_RAIL_ACTIVE_POST_THRESHOLD_PX,
  CENTER_RAIL_SCROLL_TARGET_OFFSET_PX,
  getCenterRailScrollRoot,
} from "@/components/layout/centerRailMetrics";

type ChapterNavItem = {
  id: string;
  index: number;
  title: string;
  isDraft: boolean;
  postsCount: number | null;
};

type ChapterPostNavItem = {
  id: string;
  snippet: string;
};

type Props = {
  slug: string;
  currentChapterIndex: number;
  chapters: ChapterNavItem[];
  currentChapterPosts: ChapterPostNavItem[];
};

export function ChapterRailNav({
  slug,
  currentChapterIndex,
  chapters,
  currentChapterPosts,
}: Props) {
  const [activePostId, setActivePostId] = useState<string | null>(
    currentChapterPosts[0]?.id ?? null
  );
  const rafRef = useRef(0);

  useEffect(() => {
    const scrollRoot = getCenterRailScrollRoot();
    if (!scrollRoot || currentChapterPosts.length === 0) return;

    const updateActive = () => {
      rafRef.current = 0;
      const rootTop = scrollRoot.getBoundingClientRect().top;
      const threshold = rootTop + CENTER_RAIL_ACTIVE_POST_THRESHOLD_PX;
      let nextActive = currentChapterPosts[0]?.id ?? null;

      for (const post of currentChapterPosts) {
        const node = document.getElementById(`post-${post.id}`);
        if (!node) continue;
        const top = node.getBoundingClientRect().top;
        if (top <= threshold) {
          nextActive = post.id;
        } else {
          break;
        }
      }

      setActivePostId(nextActive);
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [currentChapterPosts]);

  function scrollToPost(postId: string) {
    const scrollRoot = getCenterRailScrollRoot();
    const target = document.getElementById(`post-${postId}`);
    if (!scrollRoot || !target) return;

    const rootTop = scrollRoot.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const currentTop = scrollRoot.scrollTop;

    const nextTop =
      currentTop + (targetTop - rootTop) - CENTER_RAIL_SCROLL_TARGET_OFFSET_PX;
    scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  }

  return (
    <>
      <div className="h-[6px] w-12 bg-[#2D2D2D]" aria-hidden="true" />

      <section className="pt-[54px]">
        <h2 className="mb-8 text-[24px] font-bold leading-none">Chapters</h2>

        <ul className="space-y-1">
          {chapters.map((chapter) => {
            const idxLabel = String(chapter.index ?? 0).padStart(2, "0");
            const postsCount =
              typeof chapter.postsCount === "number"
                ? String(chapter.postsCount).padStart(2, "0")
                : "--";
            const isCurrent = chapter.index === currentChapterIndex;

            return (
              <li key={chapter.id}>
                <div
                  className={[
                    "grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-baseline gap-x-4 py-2",
                    chapter.isDraft ? "text-neutral-500" : "text-[#2D2D2D]",
                  ].join(" ")}
                >
                  <span className="header-font-archimoto text-xs font-thin tracking-[0.18em] tabular-nums opacity-80">
                    {idxLabel}
                  </span>

                  <Link
                    href={`/arcs/${slug}/${chapter.index}`}
                    className={[
                      "min-w-0 truncate text-base font-medium hover:underline",
                      isCurrent ? "underline underline-offset-4" : "",
                      chapter.isDraft ? "hover:text-[#2D2D2D]" : "",
                    ].join(" ")}
                    title={chapter.title}
                  >
                    {chapter.title}
                  </Link>

                  <span className="header-font-archimoto text-right text-xs font-thin tracking-[0.18em] tabular-nums opacity-70">
                    {postsCount}
                  </span>
                </div>

                {isCurrent && currentChapterPosts.length > 0 && (
                  <ul className="space-y-1 pb-3 pt-1">
                    {currentChapterPosts.map((post) => {
                      const active = post.id === activePostId;

                      return (
                        <li key={post.id}>
                          <button
                            type="button"
                            onClick={() => scrollToPost(post.id)}
                            className="relative grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.35rem] items-center gap-x-4 py-2 text-left"
                          >
                            <span aria-hidden="true" />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute left-[2.5rem] top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs leading-none text-[#2D2D2D]/45"
                            >
                              -
                            </span>
                            <span
                              className={[
                                "block min-w-0 truncate text-[15px] leading-[1.15] transition-colors",
                                active ? "text-[#2D2D2D]" : "text-[#2D2D2D]/42",
                              ].join(" ")}
                            >
                              {post.snippet}
                            </span>
                            <span aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
