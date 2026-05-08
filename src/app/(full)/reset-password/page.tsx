"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestPasswordReset, resetPasswordWithCode } from "@/lib/authFlowClient";
import AuthPanelShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_LINK_ROW_CLASS,
} from "@/app/(full)/AuthPanelShell";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16 text-sm opacity-70">Loading…</div>}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
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
      const { ok, payload } = await requestPasswordReset(email);

      if (!ok) {
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
      const { ok, payload } = await resetPasswordWithCode({
        email,
        code: c,
        newPassword,
      });

      if (!ok) {
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
    <AuthPanelShell title="Passphrase Reset Protocol">
      {email ? (
        <p className="text-center text-xs text-white/50">
          reset for <span className="text-white/72">{email}</span>
        </p>
      ) : (
        <p className="text-center text-xs text-white/40">email context missing</p>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="reset-code" className={AUTH_LABEL_CLASS}>
            Recovery Code
          </label>
          <input
            id="reset-code"
            className={AUTH_INPUT_CLASS}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={status !== "idle"}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reset-passphrase" className={AUTH_LABEL_CLASS}>
            New Passphrase
          </label>
          <input
            id="reset-passphrase"
            className={AUTH_INPUT_CLASS}
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={status !== "idle"}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reset-passphrase-repeat" className={AUTH_LABEL_CLASS}>
            Confirm Passphrase
          </label>
          <input
            id="reset-passphrase-repeat"
            className={AUTH_INPUT_CLASS}
            type="password"
            placeholder="••••••••"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            disabled={status !== "idle"}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {info && <p className="text-sm text-white/60">{info}</p>}

        <button className={AUTH_BUTTON_CLASS} disabled={status !== "idle"}>
          {status === "saving" ? "updating..." : "update passphrase"}
        </button>

        <button
          type="button"
          onClick={onResend}
          className={AUTH_BUTTON_CLASS}
          disabled={status !== "idle"}
        >
          {status === "resending" ? "resending..." : "resend code"}
        </button>

        <div className={AUTH_LINK_ROW_CLASS}>
          <Link className={AUTH_LINK_CLASS} href="/login">
            return to login
          </Link>
          <Link className={AUTH_LINK_CLASS} href="/forgot-password">
            restart recovery
          </Link>
        </div>
      </form>
    </AuthPanelShell>
  );
}
