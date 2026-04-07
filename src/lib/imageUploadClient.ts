"use client";

export async function uploadEditorImage(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/uploads/images", {
    method: "POST",
    body: form,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (json && typeof json.message === "string" && json.message) ||
      (json && typeof json.error === "string" && json.error) ||
      `Upload failed (${res.status})`;
    throw new Error(message);
  }

  if (!json || typeof json.url !== "string" || !json.url.trim()) {
    throw new Error("Upload returned invalid URL");
  }

  return json.url;
}
