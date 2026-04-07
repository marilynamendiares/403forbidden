import Providers from "./providers";
import { ShellUIProvider } from "@/app/shell/ShellUIContext";
import TerminalChrome from "@/app/TerminalChrome";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <ShellUIProvider>
      <TerminalChrome />
      <div className="relative z-10">
        <Providers>{children}</Providers>
      </div>
    </ShellUIProvider>
  );
}
