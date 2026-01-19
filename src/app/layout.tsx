// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "403forbidden",
  description: "Roleplay forum",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Получаем userId на сервере и формируем имя SSE-события
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  const sseEventName = userId ? `notify:user:${userId}` : undefined;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-black text-white`}>
        <Providers>
<header className="max-w-5xl mx-auto p-4 grid grid-cols-3 items-center">
  {/* Left */}
  <div className="justify-self-start">
<Link
  href="/"
  className={[
    "font-mono",
    "uppercase tracking-[0.22em]",
    "text-[12px] leading-none",
    "text-neutral-200 hover:text-white transition",
    "select-none",
  ].join(" ")}
>
  <BrandMark text="403 Forbidden" />
</Link>

  </div>

  {/* Center */}
  {/* Center */}
  <div className="justify-self-center w-full">
    {/* Narrow container for top nav (this defines underline width) */}
    <div className="mx-auto w-full max-w-2xl">
      <TopNavClient />
    </div>
  </div>

  {/* Right */}
  <div className="justify-self-end">
    <HeaderClient sseEventName={sseEventName} />
  </div>
</header>
          <main className="max-w-5xl mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
