"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resendEmailCode, verifyEmailCode } from "@/lib/authFlowClient";
import AuthPanelShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_LINK_ROW_CLASS,
} from "@/app/(full)/AuthPanelShell";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-10 text-sm opacity-70">Loading…</div>}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
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
      const { ok, payload } = await verifyEmailCode({ email, code: c });

      if (!ok) {
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
      const { ok, payload } = await resendEmailCode(email);

      if (!ok) {
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
    <AuthPanelShell title="Mesh Identity Verification">
      <p className="text-center text-xs text-white/50">
        awaiting confirmation for{" "}
        <span className="text-white/72">{email || "unknown address"}</span>
      </p>

      <form onSubmit={onVerify} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="verify-code" className={AUTH_LABEL_CLASS}>
            Verification Code
          </label>
          <input
            id="verify-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className={AUTH_INPUT_CLASS}
            disabled={status !== "idle"}
          />
        </div>

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

        <button type="submit" disabled={status !== "idle"} className={AUTH_BUTTON_CLASS}>
          {status === "verifying" ? "verifying..." : "verify identity"}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={status !== "idle"}
          className={AUTH_BUTTON_CLASS}
        >
          {status === "resending" ? "resending..." : "resend code"}
        </button>

        <div className={AUTH_LINK_ROW_CLASS}>
          <Link className={AUTH_LINK_CLASS} href="/login">
            return to login
          </Link>
          <Link className={AUTH_LINK_CLASS} href="/signup">
            wrong address
          </Link>
        </div>
      </form>
    </AuthPanelShell>
  );
}
