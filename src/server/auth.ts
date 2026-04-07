// src/server/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "./db";
import { coerceMediaKey } from "@/lib/media";

type AppUserStatus = "ACTIVE" | "BANNED" | "DELETED";

function createSessionUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarKey: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.displayName ?? user.username ?? null,
    image: user.avatarKey,
    username: user.username,
  };
}

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

        // запрет логина до подтверждения email
        if (!user.emailVerifiedAt) return null;

        // soft-delete / banned: запрещаем логин
        if (user.status !== "ACTIVE") return null;

        // ✅ ВАЖНО: в auth/jwt/session держим ТОЛЬКО key (или null)
        const avatarKey = coerceMediaKey(user.profile?.avatarUrl) ?? null;

        return createSessionUser({
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.profile?.displayName ?? null,
          avatarKey,
        });
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // При первом входе user присутствует — допишем данные в токен
      if (user) {
        token.uid = user.id;
        token.username = user.username ?? null;
        token.displayName = user.name ?? null;

        // ✅ в токене держим key, не URL
        token.avatarUrl = coerceMediaKey(user.image ?? null);

        token.userStatus = "ACTIVE";
        token.statusCheckedAt = Date.now();
        return token;
      }

      // Periodic status re-check (no spam): once per 10 minutes
      const lastCheck = token.statusCheckedAt;
      const shouldCheck = !lastCheck || Date.now() - lastCheck > 10 * 60 * 1000;

      if (shouldCheck) {
        const uid = token.sub ?? token.uid;

        if (uid) {
          const u = await prisma.user.findUnique({
            where: { id: uid },
            select: { status: true },
          });

          token.userStatus = (u?.status ?? "DELETED") as AppUserStatus;
          token.statusCheckedAt = Date.now();
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!session.user) {
        session.user = { id: "" };
      }

      const uid = token.sub ?? token.uid ?? null;

      if (uid) {
        session.user.id = uid;
        session.userId = uid;
      }

      session.user.username = token.username ?? null;
      session.user.name =
        token.displayName ?? session.user.name ?? null;

      // ✅ В сессии тоже key (UI сам резолвит)
      session.user.image = coerceMediaKey(token.avatarUrl ?? null);

      // If user was soft-deleted/banned after login, drop session
      const st = token.userStatus;
      if (st && st !== "ACTIVE") return null as never;

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
