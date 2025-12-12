// src/server/dto.ts
export type AuthorDTO = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export function toAuthorDTO(u: {
  id: string;
  username: string | null;
  profile: { displayName: string | null; avatarUrl: string | null } | null;
}): AuthorDTO {
  return {
    id: u.id,
    username: u.username ?? null,
    displayName: u.profile?.displayName ?? null,
    avatarUrl: u.profile?.avatarUrl ?? null,
  };
}
