export const CSRF_COOKIE_NAME = "csrf_token";

export function generateCsrfToken() {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

export function isLikelyValidCsrfToken(value) {
  const token = String(value || "").trim();
  return token.length >= 32 && token.length <= 128;
}

