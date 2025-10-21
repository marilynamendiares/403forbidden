// src/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Важно: никаких getProviders(), никакой отрисовки по списку провайдеров.
  // Просто обёртка для useSession/SessionProvider.
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
