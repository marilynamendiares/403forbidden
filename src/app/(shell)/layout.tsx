// src/app/(shell)/layout.tsx
import ShellRoot from "../shell/ShellRoot";
import ShellTopBar from "../shell/ShellTopBar";
import { getSessionViewer } from "@/server/session";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getSessionViewer();
  const sseEventName = userId ? `notify:user:${userId}` : undefined;

  return (
    <ShellRoot topBar={<ShellTopBar sseEventName={sseEventName} />}>{children}</ShellRoot>
  );
}
