import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, isLikelyValidCsrfToken } from "./csrf";
import { getSecurityConfig } from "./security-config";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getHmac(value) {
  const { csrfSecret } = getSecurityConfig();
  return crypto.createHmac("sha256", csrfSecret).update(value).digest();
}

function timingSafeEqual(left, right) {
  const leftDigest = getHmac(left);
  const rightDigest = getHmac(right);

  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

export function createRateLimitResponse(message, retryAfterSeconds) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Number.parseInt(String(retryAfterSeconds || 1), 10) || 1)),
      },
    }
  );
}

export function getRequestOrigin(request) {
  return request.nextUrl.origin;
}

export function validateAdminMutationRequest(request) {
  if (!MUTATING_METHODS.has(request.method)) {
    return null;
  }

  const origin = String(request.headers.get("origin") || "").trim();
  const expectedOrigin = getRequestOrigin(request);

  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const csrfCookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value || "";
  const csrfHeaderToken = String(request.headers.get("x-csrf-token") || "").trim();

  if (!isLikelyValidCsrfToken(csrfCookieToken) || !isLikelyValidCsrfToken(csrfHeaderToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  if (!timingSafeEqual(csrfCookieToken, csrfHeaderToken)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  return null;
}

