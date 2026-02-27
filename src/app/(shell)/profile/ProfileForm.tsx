// src/app/profile/ProfileForm.tsx
"use client";

import { useState, useTransition } from "react";

type Props = {
  initial: {
    email: string;
    displayName: string;
    bio: string;
  };
};

export default function ProfileForm({ initial }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    startTransition(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMessage(text || "Save failed");
        return;
      }
      setMessage("Saved ✓");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1">Display name</label>
        <input
          className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How should we call you?"
          maxLength={64}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Bio</label>
        <textarea
          className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2"
          rows={5}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A few words about you"
          maxLength={1000}
        />
      </div>

      {message && (
        <p className={`text-sm ${message.includes("✓") ? "text-green-500" : "text-red-500"}`}>{message}</p>
      )}

      <button
        className="rounded bg-white text-black px-4 py-2 disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
