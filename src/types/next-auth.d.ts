// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import type { UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
    } & DefaultSession["user"];
    userId?: string;
  }

  interface User {
    id: string;
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    uid?: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    userStatus?: UserStatus | "DELETED";
    statusCheckedAt?: number;
  }
}
