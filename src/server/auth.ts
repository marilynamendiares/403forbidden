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

        // username теперь в User, а из Profile оставляем только витрину
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            username: true, // ← ВАЖНО: username берём из User
          hashedPassword: true,
          emailVerifiedAt: true,
          profile: { select: { displayName: true, avatarUrl: true } },

          },
        });
        if (!user || !user.hashedPassword) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.hashedPassword);
        if (!ok) return null;

                // запрет логина до подтверждения email
        if (!user.emailVerifiedAt) return null;


        // Прокидываем витринные поля; username положим в user (заберём в jwt)
        return {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName ?? user.username ?? null,
          image: user.profile?.avatarUrl ?? null,
          // кастомные атрибуты (NextAuth не знает о них — поэтому any)
          username: user.username as any,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // При первом входе user присутствует — допишем данные в токен
      if (user) {
        token.uid = (user as any).id;
        token.username = (user as any).username ?? null;
        token.displayName = (user as any).name ?? null;
        token.avatarUrl = (user as any).image ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      // гарантируем объект user
      if (!session.user) session.user = {} as any;

      // id пользователя — из token.sub (или нашего uid)
      const uid = (token?.sub as string | undefined) ?? (token?.uid as string | undefined) ?? null;
      if (uid) {
        (session.user as any).id = uid;
        // обратная совместимость
        (session as any).userId = uid;
      }

      // прокинем удобные поля в сессию
      (session.user as any).username = (token as any).username ?? null;
      session.user.name =
        ((token as any).displayName as string | null) ?? session.user.name ?? null;
      session.user.image = ((token as any).avatarUrl as string | null) ?? session.user.image ?? null;

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
