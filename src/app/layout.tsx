// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HeaderClient from "./HeaderClient";
import TopNavClient from "./TopNavClient";
import BrandMark from "./BrandMark";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import Link from "next/link";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "403forbidden",
  description: "Roleplay forum",
};

// ✅ один источник правды для ширины/отступов
const SHELL =
  "mx-auto w-full max-w-[clamp(1100px,calc(100vw-64px),2320px)] px-8";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  const sseEventName = userId ? `notify:user:${userId}` : undefined;

  return (
    <html
      lang="en"
      className={[geistSans.variable, geistMono.variable, montserrat.variable].join(" ")}
    >
      <body className="antialiased min-h-screen bg-black text-white">
        <Providers>
          <header className="w-full">
            <div className={["header-font-archimoto", SHELL, "py-4 grid grid-cols-3 items-center"].join(" ")}>
              <div className="justify-self-start">
                <Link
                  href="/"
                  className={[
                    "uppercase tracking-[0.22em]",
                    "text-[12px] leading-none",
                    "text-foreground hover:text-white transition",
                    "select-none",
                  ].join(" ")}
                >
                  <BrandMark text="403 Forbidden" />
                </Link>
              </div>

              <div className="justify-self-center w-full">
                <div className="mx-auto w-full max-w-2xl">
                  <TopNavClient />
                </div>
              </div>

              <div className="justify-self-end">
                <HeaderClient sseEventName={sseEventName} />
              </div>
            </div>
          </header>

          {/* ✅ main теперь той же ширины, что и header */}
          <main className={[SHELL, "pb-10"].join(" ")}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
