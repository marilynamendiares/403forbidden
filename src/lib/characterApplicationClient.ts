import { fetchJson } from "@/lib/apiClient";
import type {
  CharacterApplicationStatus,
  CharacterForm,
} from "@/lib/characterApplication";

export type CharacterApplicationItem = {
  id: string;
  name: string;
  form: CharacterForm;
  status: CharacterApplicationStatus;
  updatedAt: string;
  moderatorNote: string | null;
};

export type AdminCharacterApplicationItem = CharacterApplicationItem & {
  lastSubmittedAt: string | null;
  user: {
    id: string;
    email: string;
    username: string;
    profile: { displayName: string; avatarUrl: string | null } | null;
  };
};

export async function fetchCharacterApplication(id: string) {
  const data = await fetchJson<{ item: CharacterApplicationItem }>(`/api/characters/${id}`, {
    includeCredentials: true,
  });
  return data.item;
}

export async function createCharacterApplication(name: string) {
  const data = await fetchJson<{ id?: string }>("/api/characters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
    includeCredentials: true,
  });
  return data.id ?? null;
}

export async function updateCharacterApplication(id: string, payload: { name: string; form: CharacterForm }) {
  await fetchJson(`/api/characters/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    includeCredentials: true,
  });
}

export async function submitCharacterApplication(id: string) {
  await fetchJson(`/api/characters/${id}/submit`, {
    method: "POST",
    includeCredentials: true,
  });
}

export async function fetchAdminCharacterApplication(id: string) {
  const data = await fetchJson<{ item: AdminCharacterApplicationItem }>(`/api/admin/characters/${id}`, {
    includeCredentials: true,
  });
  return data.item;
}

export async function reviewCharacterApplication(
  id: string,
  payload: { action: "APPROVE" | "NEEDS_CHANGES"; note?: string }
) {
  await fetchJson(`/api/admin/characters/${id}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    includeCredentials: true,
  });
}
