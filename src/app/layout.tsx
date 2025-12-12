// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HeaderClient from "./HeaderClient";

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
          <header className="max-w-5xl mx-auto p-4 flex justify-between items-center">
            <Link
  href="/"
  className="terminal-title text-xl font-semibold text-slate-100 hover:text-slate-50 transition-colors"
>
  403 Forbidden
</Link>
            <HeaderClient sseEventName={sseEventName} />
          </header>
          <main className="max-w-5xl mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
