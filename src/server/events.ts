// src/server/events.ts
type Client = {
  id: string;
  write: (chunk: string) => void; // принимает ГОТОВЫЕ строки SSE
  close: () => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __SSE_CLIENTS__: Map<string, Client> | undefined;
}
const clients: Map<string, Client> = (globalThis.__SSE_CLIENTS__ ??= new Map());

export function addClient(c: Client) { clients.set(c.id, c); }
export function removeClient(id: string) { clients.delete(id); }

export function emit(event: string, payload: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients.values()) {
    try { c.write(msg); } catch { /* ignore */ }
  }
}

export function clientCount() { return clients.size; }
