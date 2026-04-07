"use client";

import { fetchJsonResult } from "@/lib/apiClient";

type AuthFlowResult<T = Record<string, unknown>> = {
  ok: boolean;
  payload: T & { error?: string };
};

async function postJson<T extends Record<string, unknown>>(
  url: string,
  body: Record<string, unknown>
): Promise<AuthFlowResult<T>> {
  const result = await fetchJsonResult<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: result.ok, payload: result.payload };
}

export function signupWithEmail(input: {
  email: string;
  password: string;
  username: string;
}) {
  return postJson("/api/signup", input);
}

export function requestPasswordReset(email: string) {
  return postJson("/api/auth/forgot-password", { email });
}

export function verifyEmailCode(input: { email: string; code: string }) {
  return postJson("/api/auth/verify-email", input);
}

export function resendEmailCode(email: string) {
  return postJson("/api/auth/resend-code", { email });
}

export function resetPasswordWithCode(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  return postJson("/api/auth/reset-password", input);
}
