"use client";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

    if ((res as any)?.error) setError("Invalid email or password");
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

      {/* C) success banner after verification */}
      {verified && (
        <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Email confirmed. You can sign in now.
        </div>
      )}

            {resetDone && (
        <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Password updated. You can sign in now.
        </div>
      )}


      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* D) helpful hint to verify email */}
        {error && email && (
          <p className="text-xs opacity-70">
            If you just signed up, you may need to{" "}
            <a
              className="underline hover:opacity-100"
              href={`/verify-email?email=${encodeURIComponent(email)}`}
            >
              verify your email
            </a>
            .
          </p>
        )}

        <button className="w-full rounded bg-black text-white py-2">
          Sign in
        </button>

        <p className="text-xs opacity-70 text-center">
          <a className="underline hover:opacity-100" href="/forgot-password">
            Forgot password?
          </a>
        </p>
      </form>
    </div>
  );
}
