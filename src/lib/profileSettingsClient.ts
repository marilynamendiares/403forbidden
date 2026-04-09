import { fetchJson, fetchJsonResult } from "@/lib/apiClient";
import type { MyProfile } from "@/hooks/useMyProfile";

export type AvatarItem = {
  id: string;
  key: string;
  createdAt: string;
};

export function validateAvatarFile(nextFile: File | null) {
  if (!nextFile) return null;

  const isGif = nextFile.type === "image/gif";
  const maxBytes = isGif ? 1536 * 1024 : 500 * 1024;
  if (nextFile.size > maxBytes) {
    return isGif
      ? "GIF avatar is too large. Max size is 1.5 MB."
      : "Avatar is too large. Max size is 500 KB.";
  }

  if (!/^image\/(png|jpeg|webp|gif)$/.test(nextFile.type)) {
    return "Unsupported image type. Use PNG, JPG, WebP, or GIF.";
  }

  return null;
}

export async function fetchAvatarLibrary() {
  const result = await fetchJsonResult<{ items?: AvatarItem[] }>("/api/profile/avatars", {
    includeCredentials: true,
  });
  if (!result.ok) {
    return [];
  }

  return Array.isArray(result.payload?.items) ? result.payload.items : [];
}

export async function patchProfileSettings(body: {
  displayName: string;
  bio: string;
  avatarUrl?: string;
}) {
  return fetchJson<MyProfile>("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    includeCredentials: true,
    body: JSON.stringify(body),
  });
}

export async function uploadProfileAvatar(file: File) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const init = await fetchJson<{
    uploadUrl?: string;
    key?: string;
    maxBytes?: number;
    allowed?: string[];
  }>("/api/upload/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, ext }),
  });
  const { uploadUrl, key, maxBytes, allowed } = init;

  if (!key || typeof key !== "string") {
    throw new Error("Upload init returned invalid key");
  }

  if (!uploadUrl || typeof uploadUrl !== "string") {
    throw new Error("Upload init returned invalid URL");
  }

  if (typeof maxBytes === "number" && file.size > maxBytes) {
    throw new Error("Image is too large");
  }

  if (Array.isArray(allowed) && !allowed.includes(file.type)) {
    throw new Error("Unsupported image type");
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
    throw new Error(`Upload failed (${put.status})`);
  }

  return key;
}

export async function deleteProfileAvatar(id: string) {
  await fetchJson<unknown>("/api/profile/avatars", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    includeCredentials: true,
    body: JSON.stringify({ id }),
  });
}
