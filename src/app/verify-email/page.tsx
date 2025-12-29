"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const email = useMemo(() => String(sp.get("email") ?? "").toLowerCase().trim(), [sp]);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "resending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Email is missing. Go back to signup.");
      return;
    }
    const c = code.trim();
    if (c.length < 4) {
      setError("Enter the code from the email.");
      return;
    }

    setStatus("verifying");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: c }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const key = payload?.error ?? "verify_failed";
        if (key === "code_expired") setError("Code expired. Please resend.");
        else if (key === "too_many_tries") setError("Too many attempts. Please resend.");
        else setError("Invalid code. Try again.");
        return;
      }

      setInfo("Email confirmed. Redirecting to login…");
      router.push(`/login?verified=1&email=${encodeURIComponent(email)}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  async function onResend() {
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Email is missing. Go back to signup.");
      return;
    }

    setStatus("resending");
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (payload?.error === "too_fast") {
          setError("Please wait a bit before resending.");
        } else {
          setError("Failed to resend. Try again.");
        }
        return;
      }

      setInfo("Code resent. Check your inbox.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold">Verify your email</h1>
      <p className="mt-2 text-sm opacity-70">
        We sent a confirmation code to{" "}
        <span className="font-medium opacity-90">{email || "your email"}</span>
      </p>

      <form onSubmit={onVerify} className="mt-6 space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter code"
          className="w-full rounded-md border border-neutral-700 bg-transparent px-3 py-2 text-base"
          disabled={status !== "idle"}
        />

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={status !== "idle"}
          className="w-full rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-40"
        >
          {status === "verifying" ? "Verifying…" : "Verify"}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={status !== "idle"}
          className="w-full rounded-md border border-neutral-700/70 px-4 py-2 text-sm hover:bg-neutral-900/60 disabled:opacity-40"
        >
          {status === "resending" ? "Resending…" : "Resend code"}
        </button>

        <div className="pt-2 text-center text-sm opacity-70">
          Wrong email?{" "}
          <a className="underline hover:opacity-100" href="/signup">
            Go back
          </a>
        </div>
      </form>
    </main>
  );
}
