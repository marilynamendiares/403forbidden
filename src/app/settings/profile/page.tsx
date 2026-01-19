// src/app/settings/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  user: { id: string };
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // важно: username для Cancel
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // avatar
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("No file chosen");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  // Подтянуть текущие данные
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        if (r.status === 401) {
          setError("Please sign in to edit your profile.");
          setLoading(false);
          return;
        }
        if (!r.ok) {
          setError(`Failed to load profile (${r.status})`);
          setLoading(false);
          return;
        }
        const me: MeProfile = await r.json();
        if (!abort) {
          setUsername(me.username || "");
          setDisplayName(me.displayName ?? "");
          setBio(me.bio ?? "");
          setCurrentAvatar(me.avatarUrl);
        }
      } catch (e: any) {
        if (!abort) setError(e?.message || "Failed to load profile");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  // Загрузка файла в R2 → publicUrl
  async function uploadAvatar(): Promise<string | null> {
    if (!file) return null;

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const r = await fetch("/api/upload/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, ext }),
    });
    if (!r.ok) {
      setError("Failed to init avatar upload");
      return null;
    }
    const { uploadUrl, publicUrl, maxBytes, allowed } = await r.json();

    if (file.size > maxBytes) {
      setError("Image is too large");
      return null;
    }
    if (!allowed.includes(file.type)) {
      setError("Unsupported image type");
      return null;
    }

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: file,
    });
    if (!put.ok) {
      setError(`Upload failed (${put.status})`);
      return null;
    }
    return publicUrl as string;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      let uploadedUrl: string | null = null;
      if (file) {
        uploadedUrl = await uploadAvatar();
        if (!uploadedUrl) return; // ошибка уже показана
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          ...(uploadedUrl ? { avatarUrl: uploadedUrl } : {}),
        }),
      });
      if (!res.ok) {
        const msg = (await res.text()) || "Save failed";
        setError(msg);
        return;
      }

      const updated: MeProfile = await res.json();

      // моментально показать новую картинку + пробить кеш
      let finalUrl = uploadedUrl ?? updated.avatarUrl ?? null;
      if (finalUrl) {
        finalUrl = `${finalUrl}${finalUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
      }
      setCurrentAvatar(finalUrl);
      setAvatarPreview(null);
      setFile(null);
      setFileName("No file chosen");

      setUsername(updated.username || username);

      setOk("Saved");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">Edit profile</h1>

      {loading ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : error ? (
        <div className="rounded-md border border-red-900/40 bg-red-950/30 p-3 text-sm">
          {error}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          {/* Аватар + красивый файл-пикер */}
          <div>
            <label className="block text-sm font-medium mb-2">Avatar</label>

            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-1 ring-black/10 bg-neutral-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview || currentAvatar || "/default-avatar.svg"}
                  alt="avatar preview"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-1">
                {/* Кнопка-лейбл: выглядит как нативная */}
                <label
                  htmlFor="avatar"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  Choose file
                </label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    setFileName(f ? f.name : "No file chosen");
                    setAvatarPreview(f ? URL.createObjectURL(f) : null);
                    setOk(null);
                    setError(null);
                  }}
                />
                <span className="text-xs opacity-70">{fileName}</span>
                <p className="text-xs opacity-70">PNG/JPEG/WebP, до ~1.2MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              className="w-full rounded-md border bg-transparent px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              required
              placeholder="Your name as seen by others"
            />
            <p className="mt-1 text-xs opacity-70">1–64 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              className="w-full rounded-md border bg-transparent px-3 py-2 min-h-30"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              placeholder="Tell something about yourself…"
            />
            <p className="mt-1 text-xs opacity-70">Up to 1000 characters</p>
          </div>

          {ok && (
            <div className="rounded-md border border-emerald-900/40 bg-emerald-950/30 p-3 text-sm">
              {ok}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <a
              href={username ? `/u/${encodeURIComponent(username)}` : "/"}
              className="rounded-md border px-4 py-2"
            >
              Cancel
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
