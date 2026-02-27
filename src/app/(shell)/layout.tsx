// src/app/(shell)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

import SidebarFrame from "../SidebarFrame";
import { ShellVariantProvider } from "../shell/ShellVariantContext";
import { ShellUIProvider } from "../shell/ShellUIContext";
import ShellAutoOpenOnEnter from "../shell/ShellAutoOpenOnEnter";
import ShellTopBar from "../shell/ShellTopBar";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id ?? (session as any)?.userId;
  const sseEventName = userId ? `notify:user:${userId}` : undefined;

  return (
    <ShellUIProvider>
      <ShellAutoOpenOnEnter />
      <ShellVariantProvider>
        <SidebarFrame topBar={<ShellTopBar sseEventName={sseEventName} />}>
          {children}
        </SidebarFrame>
      </ShellVariantProvider>
    </ShellUIProvider>
  );
}
