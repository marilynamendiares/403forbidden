type PrismaLikeError = {
  code?: string;
};

export function isUniqueConstraintError(error: unknown) {
  const prismaError = error as PrismaLikeError;
  return prismaError?.code === "P2002";
}
