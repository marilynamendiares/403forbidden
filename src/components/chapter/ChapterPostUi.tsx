"use client";

import { Heart, Star } from "lucide-react";
import Link from "next/link";
import AvatarImg from "@/components/avatarImg";

export function ChapterPostHeader({
  author,
  character,
  createdAt,
  display,
  edited,
}: {
  author: {
    username: string | null;
    displayName?: string | null;
    avatarUrl: string | null;
  };
  character: { name: string; avatarUrl: string | null } | null;
  createdAt: string;
  display: string;
  edited: boolean;
}) {
  const displayName = character?.name ?? author.displayName ?? author.username ?? "Unknown";
  const avatarUrl = character?.avatarUrl ?? author.avatarUrl;
  const username = author.username ?? "user";

  return (
    <details className="group w-fit max-w-full">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
          {avatarUrl ? (
          <AvatarImg
            src={avatarUrl ?? undefined}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : null}
        </span>

        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-neutral-600">{displayName}</span>
          {" / "}
          <time dateTime={createdAt} title={display}>
          {display}
        </time>
        {edited ? <span className="ml-1 opacity-60">(edited)</span> : null}
        </span>
      </summary>

      <div className="ml-11 mt-2 rounded-md border border-neutral-300/70 bg-neutral-100/60 px-3 py-2 text-xs text-neutral-600">
        <div className="uppercase tracking-[0.16em] text-neutral-400">
          Character transmission
        </div>
        <div className="mt-1">
          <span className="font-medium text-neutral-700">{displayName}</span>
          {" by "}
          <Link
            href={`/u/${encodeURIComponent(username)}`}
            className="underline decoration-neutral-400 underline-offset-4 hover:text-neutral-900"
          >
            @{username}
          </Link>
        </div>
      </div>
    </details>
  );
}

export function ChapterPostReactions({
  canReact,
  isMine,
  likedByMe,
  likesCount,
  repGivenByMe,
  repCount,
  onToggleLike,
  onGiveReputation,
}: {
  canReact: boolean;
  isMine: boolean;
  likedByMe: boolean;
  likesCount: number;
  repGivenByMe: boolean;
  repCount: number;
  onToggleLike: () => void;
  onGiveReputation: () => void;
}) {
  const likeIconActive = likedByMe || likesCount > 0;
  const repIconActive = repGivenByMe || repCount > 0;

  return (
    <div className="flex items-center gap-4 text-neutral-500">
      <button
        type="button"
        disabled={!canReact}
        title={
          !canReact
            ? isMine
              ? "You cannot react to your own post"
              : "Login to react"
            : likedByMe
              ? "Remove like"
              : "Like"
        }
        className={[
          "inline-flex items-center gap-1 transition",
          !canReact ? "cursor-not-allowed opacity-40" : "hover:text-[#2D2D2D]",
          "text-neutral-500",
        ].join(" ")}
        onClick={onToggleLike}
      >
        <Heart
          className={["h-4 w-4", likeIconActive ? "text-[#B24B56]" : ""].join(" ")}
          fill={likeIconActive ? "currentColor" : "none"}
        />
        <span className="tabular-nums">{likesCount}</span>
      </button>

      <button
        type="button"
        disabled={!canReact || repGivenByMe}
        title={
          !canReact
            ? isMine
              ? "You cannot react to your own post"
              : "Login to react"
            : repGivenByMe
              ? "Reputation already given"
              : "Give reputation (+1)"
        }
        className={[
          "inline-flex items-center gap-1 transition",
          !canReact || repGivenByMe
            ? "cursor-not-allowed opacity-40"
            : "hover:text-[#2D2D2D]",
          "text-neutral-500",
        ].join(" ")}
        onClick={onGiveReputation}
      >
        <Star
          className={["h-4 w-4", repIconActive ? "text-[#B89A42]" : ""].join(" ")}
          fill={repIconActive ? "currentColor" : "none"}
        />
        <span className="tabular-nums">{repCount}</span>
      </button>
    </div>
  );
}

import { WriterStatusNotice } from "@/components/writer/WriterStatusNotice";

export function ChapterPostEditActions({
  canSave,
  busy,
  statusLabel,
  saveError,
  hasDraftState,
  onSave,
  onCancel,
  onResetDraft,
}: {
  canSave: boolean;
  busy: boolean;
  statusLabel: string;
  saveError: string | null;
  hasDraftState: boolean;
  onSave: () => void;
  onCancel: () => void;
  onResetDraft: () => void;
}) {
  return (
    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onSave} disabled={!canSave} className="hover:text-foreground disabled:opacity-50">
            Save
          </button>
          <button onClick={onCancel} disabled={busy} className="hover:text-foreground disabled:opacity-50">
            Cancel
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span>{statusLabel}</span>
          {hasDraftState ? (
            <button type="button" onClick={onResetDraft} className="hover:text-foreground">
              reset
            </button>
          ) : null}
        </div>
      </div>
      <div className="w-full">
        <WriterStatusNotice message={saveError} />
      </div>
    </div>
  );
}
