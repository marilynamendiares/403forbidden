"use client";

import { useSession, signOut } from "next-auth/react";

export default function MePage() {
  const { data, status } = useSession();

  return (
    <div className="mx-auto max-w-xl py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Session (client)</h1>
      <p>Status: {status}</p>
      <pre className="whitespace-pre-wrap rounded bg-neutral-900 p-4">
        {JSON.stringify(data, null, 2)}
      </pre>
      {data?.user && (
        <button
          className="rounded bg-neutral-800 px-3 py-1"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      )}
    </div>
  );
}
