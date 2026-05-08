"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthPanelShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_LINK_ROW_CLASS,
} from "@/app/(full)/AuthPanelShell";

function normalizeNext(sp: URLSearchParams) {
  const raw = sp.get("next") || "/";
  // принимаем только внутренние пути
  if (raw.startsWith("/")) return raw;
  try {
    const u = new URL(raw, "http://localhost"); // base не важна — только парсим
    return u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return "/";
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-16 text-sm opacity-70">Loading…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => normalizeNext(searchParams), [searchParams]);

  // A) query params
  const verified = searchParams.get("verified") === "1";
  const resetDone = searchParams.get("reset") === "1";
  const emailFromQuery = searchParams.get("email") || "";

  // B) email init from query
  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl, // ← ключевой момент
    });

    if (res?.error) setError("Invalid email or password");
  }

  return (
    <AuthPanelShell title="Mesh Authentication Protocol">
      {/* C) success banner after verification */}
      {verified && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Email confirmed. You can sign in now.
        </div>
      )}

      {resetDone && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Password updated. You can sign in now.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="login-identifier" className={AUTH_LABEL_CLASS}>
            Identifier
          </label>
          <input
            id="login-identifier"
            className={AUTH_INPUT_CLASS}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="callsign"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="login-passphrase" className={AUTH_LABEL_CLASS}>
            Passphrase
          </label>
          <input
            id="login-passphrase"
            className={AUTH_INPUT_CLASS}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        {error && email && (
          <p className="text-xs text-white/55">
            If you just signed up, you may need to{" "}
            <Link
              className="underline hover:text-white"
              href={`/verify-email?email=${encodeURIComponent(email)}`}
            >
              verify your email
            </Link>
            .
          </p>
        )}

        <button className={AUTH_BUTTON_CLASS}>authenticate</button>

        <div className={AUTH_LINK_ROW_CLASS}>
          <Link className={AUTH_LINK_CLASS} href="/forgot-password">
            recover access
          </Link>
          <Link className={AUTH_LINK_CLASS} href="/signup">
            request invite
          </Link>
        </div>
      </form>
    </AuthPanelShell>
  );
}
