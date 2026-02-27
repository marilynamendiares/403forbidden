// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import GlobalBackground from "@/app/GlobalBackground";
import GlobalBrand from "@/app/GlobalBrand";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={[geistSans.variable, geistMono.variable, montserrat.variable].join(" ")}
    >
      <body className="antialiased min-h-screen text-white relative">
        <GlobalBackground />
        <div className="relative z-10">
          <GlobalBrand />
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
