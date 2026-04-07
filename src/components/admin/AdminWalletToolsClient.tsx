"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { fetchJson, fetchJsonResult } from "@/lib/apiClient";

type WalletToolResult = {
  user?: {
    username: string;
    profile: { displayName: string | null } | null;
  };
  before?: {
    eurodollars: number;
    reputationTotal: number;
  };
  after?: {
    eurodollars: number;
    reputationTotal: number;
  };
  error?: string;
};

type AdminUserSuggestion = {
  id: string;
  username: string;
  email: string;
  profile: { displayName: string | null; avatarUrl: string | null } | null;
};

export default function AdminWalletToolsClient() {
  const [username, setUsername] = useState("");
  const [eurodollarsDelta, setEurodollarsDelta] = useState("0");
  const [reputationDelta, setReputationDelta] = useState("0");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<AdminUserSuggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState("");
  const deferredUsername = useDeferredValue(username);

  const trimmedUsername = useMemo(() => deferredUsername.trim(), [deferredUsername]);

  useEffect(() => {
    if (trimmedUsername.replace(/^@/, "").length < 2) {
      setSuggestions([]);
      setSuggestionsError("");
      return;
    }

    const controller = new AbortController();

    async function loadSuggestions() {
      try {
        setSuggestionsError("");
        const data = await fetchJson<{ items: AdminUserSuggestion[] }>(
          `/api/admin/users/search?q=${encodeURIComponent(trimmedUsername)}`,
          {
            includeCredentials: true,
            signal: controller.signal,
          }
        );
        setSuggestions(data.items ?? []);
      } catch (loadError: unknown) {
        if (controller.signal.aborted) {
          return;
        }
        setSuggestions([]);
        setSuggestionsError(loadError instanceof Error ? loadError.message : "Lookup failed");
      }
    }

    void loadSuggestions();
    return () => controller.abort();
  }, [trimmedUsername]);

  function chooseSuggestion(suggestion: AdminUserSuggestion) {
    setUsername(suggestion.username);
    setSuggestions([]);
    setSuggestionsError("");
  }

  function submit() {
    setError("");
    setMessage("");

    startTransition(async () => {
      const result = await fetchJsonResult<WalletToolResult>("/api/admin/tools/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          eurodollarsDelta: Number(eurodollarsDelta || 0),
          reputationDelta: Number(reputationDelta || 0),
        }),
      });

      if (!result.ok) {
        setError(result.payload.error ?? "Tool action failed");
        return;
      }

      const displayName =
        result.payload.user?.profile?.displayName ?? result.payload.user?.username ?? username;
      setMessage(
        `${displayName}: €$ ${result.payload.before?.eurodollars ?? 0} -> ${result.payload.after?.eurodollars ?? 0}, rep ${result.payload.before?.reputationTotal ?? 0} -> ${result.payload.after?.reputationTotal ?? 0}`
      );
      setSuggestions([]);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-900 bg-neutral-950/35 p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-neutral-300">Manual wallet tool</div>
            <div className="text-xs leading-5 text-neutral-500">
              Search the player, adjust values, then apply a single audited mutation.
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="rounded-lg border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900 disabled:opacity-50"
          >
            {isPending ? "Applying..." : "Apply Wallet Tool"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <label className="space-y-1">
          <div className="text-xs uppercase tracking-wide opacity-60">Target player</div>
          <div className="space-y-2">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@username"
              className="w-full rounded-lg border border-neutral-800 bg-transparent px-3 py-2.5 text-sm"
            />
            {suggestions.length > 0 ? (
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/70">
                <div className="border-b border-neutral-900 px-3 py-2 text-[11px] uppercase tracking-wide opacity-60">
                  Matching users
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => chooseSuggestion(suggestion)}
                      className="flex w-full items-start justify-between gap-3 border-b border-neutral-900 px-3 py-2 text-left last:border-b-0 hover:bg-neutral-900/60"
                    >
                      <div className="min-w-0">
                        <div className="text-sm">
                          {suggestion.profile?.displayName ?? `@${suggestion.username}`}
                        </div>
                        <div className="text-xs opacity-60">
                          @{suggestion.username} · {suggestion.email}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {suggestionsError ? <div className="text-xs text-rose-400">{suggestionsError}</div> : null}
          </div>
          </label>

          <label className="space-y-1">
            <div className="text-xs uppercase tracking-wide opacity-60">Eurodollars Delta</div>
            <input
              value={eurodollarsDelta}
              onChange={(event) => setEurodollarsDelta(event.target.value)}
              placeholder="100 or -100"
              className="w-full rounded-lg border border-neutral-800 bg-transparent px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs uppercase tracking-wide opacity-60">Reputation Delta</div>
            <input
              value={reputationDelta}
              onChange={(event) => setReputationDelta(event.target.value)}
              placeholder="1 or -1"
              className="w-full rounded-lg border border-neutral-800 bg-transparent px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          Choose from suggestions or use an exact username. Wallet values clamp at zero.
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-300">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">{message}</div> : null}
    </div>
  );
}
