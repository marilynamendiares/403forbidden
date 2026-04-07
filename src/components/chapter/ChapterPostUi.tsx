"use client";

import { Heart, Star } from "lucide-react";
import AvatarImg from "@/components/avatarImg";

export function ChapterPostHeader({
  author,
  display,
  edited,
}: {
  author: { username: string | null; avatarUrl: string | null };
  display: string;
  edited: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
        {author.avatarUrl ? (
          <AvatarImg
            src={author.avatarUrl ?? undefined}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : null}
      </div>

      <div className="text-sm text-muted-foreground">
        posted by <span className="font-medium">@{author.username ?? "user"}</span>
        {" • "}
        <time dateTime={new Date(display).toISOString()} title={display}>
          {display}
        </time>
        {edited ? <span className="ml-1 opacity-60">(edited)</span> : null}
      </div>
    </div>
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
