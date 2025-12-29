"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const email = useMemo(
    () => String(sp.get("email") ?? "").toLowerCase().trim(),
    [sp]
  );

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "resending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onResend() {
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Email is missing. Go back.");
      return;
    }

    setStatus("resending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (payload?.error === "too_fast") setError("Please wait a bit before resending.");
        else setError("Failed to resend. Try again.");
        return;
      }

      setInfo("Code resent. Check your inbox.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Email is missing. Go back.");
      return;
    }

    const c = code.trim();
    if (c.length < 4) {
      setError("Enter the reset code.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== newPassword2) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: c, newPassword }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const key = payload?.error ?? "reset_failed";
        if (key === "code_expired") setError("Code expired. Please resend.");
        else if (key === "too_many_tries") setError("Too many attempts. Please resend.");
        else setError("Invalid code. Try again.");
        return;
      }

      setInfo("Password updated. Redirecting to login…");
      router.push(`/login?reset=1&email=${encodeURIComponent(email)}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-semibold mb-2">Set a new password</h1>
      <p className="text-sm opacity-70 mb-6">
        {email ? (
          <>
            Reset for <span className="font-medium">{email}</span>
          </>
        ) : (
          "Email is missing."
        )}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Reset code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={status !== "idle"}
          inputMode="numeric"
          autoComplete="one-time-code"
        />

        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={status !== "idle"}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="Repeat new password"
          value={newPassword2}
          onChange={(e) => setNewPassword2(e.target.value)}
          disabled={status !== "idle"}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {info && <p className="text-sm opacity-70">{info}</p>}

        <button
          className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          disabled={status !== "idle"}
        >
          {status === "saving" ? "Saving..." : "Update password"}
        </button>

        <button
          type="button"
          onClick={onResend}
          className="w-full border rounded px-3 py-2 disabled:opacity-50"
          disabled={status !== "idle"}
        >
          Resend code
        </button>
      </form>
    </div>
  );
}
