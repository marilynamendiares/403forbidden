// src/server/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "./db";
import { normalizeUrl } from "@/lib/media";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },

  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        });
        const parsed = schema.safeParse(creds);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            username: true,
            hashedPassword: true,
            emailVerifiedAt: true,
            status: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        });
        if (!user || !user.hashedPassword) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.hashedPassword);
        if (!ok) return null;

        if (!user.emailVerifiedAt) return null;
        if (user.status !== "ACTIVE") return null;

        // ⚠️ важно: нормализуем ДО записи в jwt (иначе токен держит мусор)
        const avatar = normalizeUrl(user.profile?.avatarUrl) ?? null;

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName ?? user.username ?? null,
          image: avatar,
          username: user.username as any,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.username = (user as any).username ?? null;
        token.displayName = (user as any).name ?? null;

        // ⚠️ важно: в токене держим уже нормализованное
        token.avatarUrl = normalizeUrl((user as any).image ?? null);

        (token as any).userStatus = "ACTIVE";
        (token as any).statusCheckedAt = Date.now();
        return token;
      }

      const lastCheck = (token as any).statusCheckedAt as number | undefined;
      const shouldCheck = !lastCheck || Date.now() - lastCheck > 10 * 60 * 1000;

      if (shouldCheck) {
        const uid =
          (token?.sub as string | undefined) ??
          ((token as any).uid as string | undefined);

        if (uid) {
          const u = await prisma.user.findUnique({
            where: { id: uid },
            select: { status: true },
          });

          (token as any).userStatus = u?.status ?? "DELETED";
          (token as any).statusCheckedAt = Date.now();
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!session.user) session.user = {} as any;

      const uid =
        (token?.sub as string | undefined) ??
        (token?.uid as string | undefined) ??
        null;

      if (uid) {
        (session.user as any).id = uid;
        (session as any).userId = uid;
      }

      (session.user as any).username = (token as any).username ?? null;
      session.user.name =
        ((token as any).displayName as string | null) ??
        session.user.name ??
        null;

      // ⚠️ важно: на выходе в сессию тоже отдаём нормализованное
      session.user.image = normalizeUrl((token as any).avatarUrl ?? null) ?? null;

      const st = (token as any).userStatus as string | undefined;
      if (st && st !== "ACTIVE") return null as any;

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        const b = new URL(baseUrl);
        if (u.origin === b.origin) return url;
      } catch {}
      return baseUrl;
    },
  },
};
