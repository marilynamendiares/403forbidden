// src/app/settings/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveMediaUrl } from "@/lib/media";

type MeProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null; // key
  bannerUrl: string | null;
  user: { id: string };
};

type AvatarItem = {
  id: string;
  key: string; // key
  createdAt: string;
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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
    const r = await fetch("/api/profile/avatars", { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json().catch(() => null);
    const items: AvatarItem[] = Array.isArray(j?.items) ? j.items : [];
    setAvatars(items);
  }

  // initial load
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

        if (!abort) {
          await refreshAvatarLibrary();
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

  // init + PUT → returns key
  async function uploadAvatar(): Promise<string | null> {
    if (!file) return null;

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const init = await fetch("/api/upload/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, ext }),
    });

if (!init.ok) {
  const txt = await init.text().catch(() => "");
  setError(`Could not init avatar upload (${init.status}) ${txt}`.trim());
  return null;
}

    const { uploadUrl, key, maxBytes, allowed } = await init.json();

    if (!key || typeof key !== "string") {
      setError("Upload init returned invalid key");
      return null;
    }

    if (typeof maxBytes === "number" && file.size > maxBytes) {
      setError("Image is too large");
      return null;
    }

    if (Array.isArray(allowed) && !allowed.includes(file.type)) {
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

    return key as string;
  }

  async function setActiveAvatar(key: string) {
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatarUrl: key,
        }),
      });

      if (!res.ok) {
        const msg = (await res.text()) || "Save failed";
        setError(msg);
        return;
      }

      const updated: MeProfile = await res.json();
      setCurrentAvatar(updated.avatarUrl);
      setAvatarBuster(Date.now());
      setOk("Saved");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAvatar(id: string) {
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const r = await fetch("/api/profile/avatars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!r.ok && r.status !== 204) {
        const msg = (await r.text()) || "Delete failed";
        setError(msg);
        return;
      }

      await refreshAvatarLibrary();

      // подтянуть профиль заново (на случай если удалили активную и она сбросилась)
      const meRes = await fetch("/api/profile", { cache: "no-store" });
      if (meRes.ok) {
        const me: MeProfile = await meRes.json();
        setCurrentAvatar(me.avatarUrl);
        setAvatarBuster(Date.now());
      }

      setOk("Deleted");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      let uploadedKey: string | null = null;

      if (file) {
        uploadedKey = await uploadAvatar();
        if (!uploadedKey) return; // error already set
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          ...(uploadedKey ? { avatarUrl: uploadedKey } : {}),
        }),
      });

      if (!res.ok) {
        const msg = (await res.text()) || "Save failed";
        setError(msg);
        return;
      }

      const updated: MeProfile = await res.json();

      const finalKey = uploadedKey ?? updated.avatarUrl ?? null;
      setCurrentAvatar(finalKey);
      setAvatarBuster(Date.now());

      // очистка выбора файла
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFile(null);
      setFileName("No file chosen");

      setUsername(updated.username || username);

      await refreshAvatarLibrary();

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
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium mb-2">Avatar</label>

            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-1 ring-black/10 bg-neutral-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview || currentAvatarSrc || "/default-avatar.svg"}
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
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0] ?? null;

                    setOk(null);
                    setError(null);

                    // cleanup старого preview
                    setAvatarPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });

                    if (!f) {
                      setFile(null);
                      setFileName("No file chosen");
                      return;
                    }

                    const MAX = 500 * 1024; // 500KB
                    if (f.size > MAX) {
                      setError("Avatar is too large. Max size is 500 KB.");
                      e.currentTarget.value = "";
                      setFile(null);
                      setFileName("No file chosen");
                      return;
                    }

                    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
                      setError("Unsupported image type. Use PNG, JPG, or WebP.");
                      e.currentTarget.value = "";
                      setFile(null);
                      setFileName("No file chosen");
                      return;
                    }

                    setFile(f);
                    setFileName(f.name);
                    setAvatarPreview(URL.createObjectURL(f));
                  }}
                />

                <span className="text-xs opacity-70">{fileName}</span>
                <p className="text-xs opacity-70">PNG/JPEG/WebP, up to 500 KB</p>
              </div>
            </div>

            {/* Previous avatars */}
            {avatars.length > 0 && (
              <div className="mt-4 rounded-md border border-neutral-800 p-3">
                <div className="text-sm font-medium mb-2">
                  Previous avatars (max 5)
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {avatars.map((a) => (
                    <div key={a.id} className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        className="h-14 w-14 rounded-full overflow-hidden ring-1 ring-neutral-700 hover:ring-neutral-400"
                        onClick={() => setActiveAvatar(a.key)}
                        title="Set as active"
                        disabled={saving}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveMediaUrl(a.key) || "/default-avatar.svg"}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        className="text-[11px] opacity-70 hover:opacity-100 underline"
                        onClick={() => deleteAvatar(a.id)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-xs opacity-70 mt-3">
                  Click an avatar to set it active.
                </p>
              </div>
            )}
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
