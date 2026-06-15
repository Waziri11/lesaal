import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import {
  GOOGLE_DRIVE_OAUTH_STATE_COOKIE_NAME,
  GOOGLE_DRIVE_OAUTH_STATE_MAX_AGE_SECONDS,
  buildGoogleDriveAuthorizationUrl,
  createGoogleDriveOAuthState,
  sanitizeAdminReturnPath,
} from "../../../../../../lib/google-drive";

function setOAuthStateCookie(response, nonce) {
  response.cookies.set({
    name: GOOGLE_DRIVE_OAUTH_STATE_COOKIE_NAME,
    value: String(nonce || ""),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GOOGLE_DRIVE_OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

function buildReturnUrl(request, returnTo, queryParams = {}) {
  const url = new URL(sanitizeAdminReturnPath(returnTo), request.nextUrl.origin);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value == null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export async function GET(request) {
  const returnTo = sanitizeAdminReturnPath(request.nextUrl.searchParams.get("returnTo"));

  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nonce = crypto.randomBytes(24).toString("base64url");
    const state = createGoogleDriveOAuthState({
      nonce,
      returnTo,
    });
    const redirectUrl = buildGoogleDriveAuthorizationUrl({ state });
    const response = NextResponse.redirect(redirectUrl);
    setOAuthStateCookie(response, nonce);
    return response;
  } catch (error) {
    console.error("Unable to start Google Drive OAuth flow", error);
    return NextResponse.redirect(
      buildReturnUrl(request, returnTo, {
        gd_error: "connect_unavailable",
      })
    );
  }
}
