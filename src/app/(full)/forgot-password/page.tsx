"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const e1 = email.toLowerCase().trim();
    if (!e1) {
      setError("Enter your email.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e1 }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (payload?.error === "too_fast") setError("Please wait a bit and try again.");
        else setError("Failed to send code. Try again.");
        return;
      }

      setInfo("If the email exists, we sent a reset code. Redirecting…");
      router.push(`/reset-password?email=${encodeURIComponent(e1)}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-semibold mb-2">Reset password</h1>
      <p className="text-sm opacity-70 mb-6">
        Enter your email — we’ll send a reset code.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status !== "idle"}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {info && <p className="text-sm opacity-70">{info}</p>}

        <button
          className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          disabled={status !== "idle"}
        >
          {status === "sending" ? "Sending..." : "Send code"}
        </button>
      </form>
    </div>
  );
}
