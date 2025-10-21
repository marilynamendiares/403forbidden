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

  const [email, setEmail] = useState("");
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
        <button className="w-full rounded bg-black text-white py-2">Sign in</button>
      </form>
    </div>
  );
}
