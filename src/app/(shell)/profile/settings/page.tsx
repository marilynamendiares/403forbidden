// src/app/profile/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  deleteProfileAvatar,
  fetchAvatarLibrary,
  patchProfileSettings,
  type AvatarItem,
  uploadProfileAvatar,
  validateAvatarFile,
} from "@/lib/profileSettingsClient";

type StatusTone = "error" | "success";

function StatusMessage({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-red-900/40 bg-red-950/30"
      : "border-emerald-900/40 bg-emerald-950/30";

  return <div className={`rounded-md border p-3 text-sm ${toneClass}`}>{children}</div>;
}

function AvatarLibraryItem({
  avatar,
  saving,
  onSetActive,
  onDelete,
}: {
  avatar: AvatarItem;
  saving: boolean;
  onSetActive: (key: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        className="h-14 w-14 overflow-hidden rounded-full ring-1 ring-neutral-700 hover:ring-neutral-400"
        onClick={() => onSetActive(avatar.key)}
        title="Set as active"
        disabled={saving}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveMediaUrl(avatar.key) || "/default-avatar.jpg"}
          alt="avatar"
          className="h-full w-full object-cover"
        />
      </button>

      <button
        type="button"
        className="text-[11px] opacity-70 underline hover:opacity-100"
        onClick={() => onDelete(avatar.id)}
        disabled={saving}
      >
        Delete
      </button>
    </div>
  );
}

function ProfileSettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <label className="block text-sm font-medium">{title}</label>
      {children}
    </section>
  );
}

function AvatarLibrarySection({
  avatars,
  saving,
  onSetActive,
  onDelete,
}: {
  avatars: AvatarItem[];
  saving: boolean;
  onSetActive: (key: string) => void;
  onDelete: (id: string) => void;
}) {
  if (avatars.length === 0) return null;

  return (
    <div className="mt-4 rounded-md border border-neutral-800 p-3">
      <div className="mb-2 text-sm font-medium">Previous avatars (max 5)</div>

      <div className="grid grid-cols-5 gap-2">
        {avatars.map((avatar) => (
          <AvatarLibraryItem
            key={avatar.id}
            avatar={avatar}
            saving={saving}
            onSetActive={onSetActive}
            onDelete={onDelete}
          />
        ))}
      </div>

      <p className="mt-3 text-xs opacity-70">Click an avatar to set it active.</p>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { profile, isLoading: profileLoading, refresh: refreshProfile } = useMyProfile();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // avatar upload
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("No file chosen");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null); // key
  const [avatarBuster, setAvatarBuster] = useState<number>(0);

  // avatar library
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);

  // cleanup objectURL
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const currentAvatarSrc = useMemo(() => {
    const base = resolveMediaUrl(currentAvatar) || null;
    if (!base) return null;
    const glue = base.includes("?") ? "&" : "?";
    return `${base}${glue}v=${avatarBuster || 0}`;
  }, [currentAvatar, avatarBuster]);

  async function refreshAvatarLibrary() {
    const items = await fetchAvatarLibrary();
    setAvatars(items);
  }

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username || "");
    setDisplayName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    setCurrentAvatar(profile.avatarUrl);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    void refreshAvatarLibrary();
  }, [profile]);

  function clearSelectedFile() {
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
    setFileName("No file chosen");
  }

  function getErrorMessage(value: unknown, fallback: string) {
    return value instanceof Error && value.message ? value.message : fallback;
  }

  async function runProfileTask(
    task: () => Promise<void>,
    fallbackMessage: string,
    successMessage?: string
  ) {
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      await task();
      if (successMessage) {
        setOk(successMessage);
      }
      router.refresh();
    } catch (e: unknown) {
      setError(getErrorMessage(e, fallbackMessage));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!file) return null;

    try {
      return await uploadProfileAvatar(file);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Upload failed"));
      return null;
    }
  }

  async function setActiveAvatar(key: string) {
    await runProfileTask(async () => {
      const updated = await patchProfileSettings({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: key,
      });
      setCurrentAvatar(updated.avatarUrl);
      setAvatarBuster(Date.now());
      await refreshProfile();
    }, "Save failed", "Saved");
  }

  async function deleteAvatar(id: string) {
    await runProfileTask(async () => {
      await deleteProfileAvatar(id);
      await refreshAvatarLibrary();
      await refreshProfile();
      setAvatarBuster(Date.now());
    }, "Delete failed", "Deleted");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    await runProfileTask(async () => {
      let uploadedKey: string | null = null;

      if (file) {
        uploadedKey = await uploadAvatar();
        if (!uploadedKey) return; // error already set
      }

      const updated = await patchProfileSettings({
        displayName: displayName.trim(),
        bio: bio.trim(),
        ...(uploadedKey ? { avatarUrl: uploadedKey } : {}),
      });

      const finalKey = uploadedKey ?? updated.avatarUrl ?? null;
      setCurrentAvatar(finalKey);
      setAvatarBuster(Date.now());

      clearSelectedFile();

      setUsername(updated.username || username);

      await refreshAvatarLibrary();
      await refreshProfile();
    }, "Save failed", "Saved");
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-8">
      <h1 className="text-3xl font-semibold mb-6">Edit profile</h1>

      {profileLoading ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : !profile ? (
        <StatusMessage tone="error">
          Please sign in to edit your profile.
        </StatusMessage>
      ) : error ? (
        <StatusMessage tone="error">
          {error}
        </StatusMessage>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <ProfileSettingsSection title="Avatar">
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-1 ring-black/10 bg-neutral-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview || currentAvatarSrc || "/default-avatar.jpg"}
                  alt="avatar preview"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="avatar"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  Choose file
                </label>

                <input
                  id="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0] ?? null;

                    setOk(null);
                    setError(null);

                    clearSelectedFile();

                    if (!f) {
                      return;
                    }

                    const validationError = validateAvatarFile(f);
                    if (validationError) {
                      setError(validationError);
                      e.currentTarget.value = "";
                      return;
                    }

                    setFile(f);
                    setFileName(f.name);
                    setAvatarPreview(URL.createObjectURL(f));
                  }}
                />

                <span className="text-xs opacity-70">{fileName}</span>
                <p className="text-xs opacity-70">PNG/JPEG/WebP up to 500 KB, GIF up to 1.5 MB</p>
              </div>
            </div>

            <AvatarLibrarySection
              avatars={avatars}
              saving={saving}
              onSetActive={setActiveAvatar}
              onDelete={deleteAvatar}
            />
          </ProfileSettingsSection>

          <ProfileSettingsSection title="Display name">
            <input
              className="w-full rounded-md border bg-transparent px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              required
              placeholder="Your name as seen by others"
            />
            <p className="mt-1 text-xs opacity-70">1–64 characters</p>
          </ProfileSettingsSection>

          <ProfileSettingsSection title="Bio">
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 min-h-30"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              placeholder="Tell something about yourself…"
            />
            <p className="mt-1 text-xs opacity-70">Up to 1000 characters</p>
          </ProfileSettingsSection>

          {ok && (
            <StatusMessage tone="success">
              {ok}
            </StatusMessage>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <Link
              href={username ? `/u/${encodeURIComponent(username)}` : "/"}
              className="rounded-md border px-4 py-2"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
