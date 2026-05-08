"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset } from "@/lib/authFlowClient";
import AuthPanelShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_LINK_ROW_CLASS,
} from "@/app/(full)/AuthPanelShell";

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
      const { ok, payload } = await requestPasswordReset(e1);

      if (!ok) {
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
    <AuthPanelShell title="Access Recovery Protocol">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="forgot-address" className={AUTH_LABEL_CLASS}>
            Contact Address
          </label>
          <input
            id="forgot-address"
            className={AUTH_INPUT_CLASS}
            type="email"
            inputMode="email"
            placeholder="operator@mesh.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status !== "idle"}
            autoComplete="email"
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {info && <p className="text-sm text-white/60">{info}</p>}

        <button className={AUTH_BUTTON_CLASS} disabled={status !== "idle"}>
          {status === "sending" ? "sending..." : "send recovery code"}
        </button>

        <div className={AUTH_LINK_ROW_CLASS}>
          <Link className={AUTH_LINK_CLASS} href="/login">
            return to login
          </Link>
          <Link className={AUTH_LINK_CLASS} href="/signup">
            request invite
          </Link>
        </div>
      </form>
    </AuthPanelShell>
  );
}
