// src/app/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;

  if (!userId) {
    // если не залогинен — на страницу логина
    redirect("/login?next=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      profile: {
        select: {
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
        },
      },
    },
  });

  if (!user) redirect("/login?next=/profile");

  const initial = {
    email: user.email,
    displayName: user.profile?.displayName ?? "",
    bio: user.profile?.bio ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="rounded border border-neutral-800 p-4">
        <p className="text-sm opacity-70 mb-2">Email: {initial.email}</p>
        <ProfileForm initial={initial} />
      </div>
    </div>
  );
}
