import {
  getApprovedCharacterIdentity,
  hasApprovedCharacter,
} from "@/server/services/characterIdentity";

export async function isPlayer(userId: string | null) {
  return hasApprovedCharacter(userId);
}


export async function requirePlayer(userId: string | null) {
  if (!userId) {
    throw Object.assign(new Error("PLAYER_REQUIRED"), {
      status: 403,
      code: "PLAYER_REQUIRED",
    });
  }
  const ok = await isPlayer(userId);
  if (!ok) {
    throw Object.assign(new Error("PLAYER_REQUIRED"), {
      status: 403,
      code: "PLAYER_REQUIRED",
    });
  }
}

export async function getApprovedCharacter(userId: string) {
  return getApprovedCharacterIdentity(userId);
}
