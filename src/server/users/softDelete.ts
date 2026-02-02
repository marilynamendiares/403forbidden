import { prisma } from "@/server/db";

export async function softDeleteUser(userId: string) {
  // 1) Mark user as deleted
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "DELETED",
      deletedAt: new Date(),
    },
  });

  // 2) Optional: invalidate sessions (force logout)
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } }); // optional, depends on your auth flows
}
