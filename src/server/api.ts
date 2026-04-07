import { error } from "@/server/http";
import { requireSessionUserId } from "@/server/session";

export type RouteError = Error & {
  status?: number;
};

export function routeError(message: string, status: number): RouteError {
  return Object.assign(new Error(message), { status });
}

export function getRouteErrorResponse(errorLike: unknown, fallback = "Internal error") {
  const routeErr = errorLike as RouteError;
  return error(routeErr.message || fallback, routeErr.status ?? 500);
}

export async function requireApiUserId() {
  try {
    return await requireSessionUserId();
  } catch {
    throw routeError("Unauthorized", 401);
  }
}

export function parsePositiveIntParam(value: string) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}
