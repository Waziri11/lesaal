import { getSecurityConfig } from "./security-config";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken({ token, remoteIp = "" }) {
  const trimmedToken = String(token || "").trim();

  if (!trimmedToken) {
    return { success: false, errors: ["missing-input-response"] };
  }

  const { turnstileSecretKey } = getSecurityConfig();

  const payload = new URLSearchParams({
    secret: turnstileSecretKey,
    response: trimmedToken,
  });

  if (remoteIp && remoteIp !== "unknown") {
    payload.set("remoteip", remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    return { success: false, errors: ["turnstile-unreachable"] };
  }

  const result = await response.json();
  const errors = Array.isArray(result?.["error-codes"]) ? result["error-codes"] : [];

  return {
    success: Boolean(result?.success),
    errors,
  };
}

