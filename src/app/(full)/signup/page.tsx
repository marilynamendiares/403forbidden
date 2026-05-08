"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupWithEmail } from "@/lib/authFlowClient";
import AuthPanelShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_LINK_ROW_CLASS,
} from "@/app/(full)/AuthPanelShell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // защита от двойного клика
    setLoading(true);
    setError("");

    const { ok, payload } = await signupWithEmail({ email, password, username });
    setLoading(false);

    if (ok) {
      // после успешной регистрации — ведём подтверждать email
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } else {
      setError(payload.error || "Registration failed");
    }
  }

  return (
    <AuthPanelShell title="Mesh Access Request">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="signup-identifier" className={AUTH_LABEL_CLASS}>
            Identifier
          </label>
          <input
            id="signup-identifier"
            className={AUTH_INPUT_CLASS}
            placeholder="callsign"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-address" className={AUTH_LABEL_CLASS}>
            Contact Address
          </label>
          <input
            id="signup-address"
            className={AUTH_INPUT_CLASS}
            type="email"
            inputMode="email"
            placeholder="operator@mesh.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-passphrase" className={AUTH_LABEL_CLASS}>
            Passphrase
          </label>
          <input
            id="signup-passphrase"
            className={AUTH_INPUT_CLASS}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button className={AUTH_BUTTON_CLASS} disabled={loading}>
          {loading ? "requesting..." : "request invite"}
        </button>

        <div className={AUTH_LINK_ROW_CLASS}>
          <Link className={AUTH_LINK_CLASS} href="/login">
            return to login
          </Link>
          <Link className={AUTH_LINK_CLASS} href="/forgot-password">
            recover access
          </Link>
        </div>
      </form>
    </AuthPanelShell>
  );
}
