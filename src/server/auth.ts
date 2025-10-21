// src/server/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  // наши кастомные страницы
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
            hashedPassword: true,
            profile: { select: { displayName: true, username: true } },
          },
        });
        if (!user || !user.hashedPassword) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.hashedPassword);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName ?? user.profile?.username ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // пробрасываем id пользователя в сессию
    async session({ session, token }) {
      if (token?.sub) (session as any).userId = token.sub;
      return session;
    },

    // jwt без изменений
    async jwt({ token }) {
      return token;
    },

    // безопасные редиректы после signIn/signOut
    async redirect({ url, baseUrl }) {
      // относительные пути → внутрь приложения
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // абсолютные урлы: разрешаем только свой origin
      try {
        const u = new URL(url);
        const b = new URL(baseUrl);
        if (u.origin === b.origin) return url;
      } catch {
        // игнор, упадём в fallback
      }

      // fallback — на главную
      return baseUrl;
    },
  },
};
