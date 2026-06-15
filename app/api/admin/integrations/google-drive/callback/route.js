import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import {
  GOOGLE_DRIVE_OAUTH_STATE_COOKIE_NAME,
  exchangeGoogleAuthCodeForTokens,
  fetchGoogleDriveUserProfile,
  parseAndVerifyGoogleDriveOAuthState,
  sanitizeAdminReturnPath,
  encryptGoogleDriveRefreshToken,
} from "../../../../../../lib/google-drive";
import { prisma } from "../../../../../../lib/prisma";
import { isMissingAdminGoogleDriveConnectionTableError } from "../../../../../../lib/project-repository";

function clearOAuthStateCookie(response) {
  response.cookies.set({
    name: GOOGLE_DRIVE_OAUTH_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
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

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function redirectWithStatus(request, returnTo, queryParams = {}) {
  const response = NextResponse.redirect(buildReturnUrl(request, returnTo, queryParams));
  clearOAuthStateCookie(response);
  return response;
}

export async function GET(request) {
  const stateParam = String(request.nextUrl.searchParams.get("state") || "");
  const parsedState = parseAndVerifyGoogleDriveOAuthState(stateParam);
  const returnTo = sanitizeAdminReturnPath(parsedState?.returnTo);

  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stateNonceCookie = String(request.cookies.get(GOOGLE_DRIVE_OAUTH_STATE_COOKIE_NAME)?.value || "").trim();

    if (!parsedState || !stateNonceCookie || !timingSafeEqual(parsedState.nonce, stateNonceCookie)) {
      return redirectWithStatus(request, returnTo, {
        gd_error: "invalid_state",
      });
    }

    const oauthError = String(request.nextUrl.searchParams.get("error") || "").trim();
    if (oauthError) {
      return redirectWithStatus(request, returnTo, {
        gd_error: oauthError,
      });
    }

    const code = String(request.nextUrl.searchParams.get("code") || "").trim();
    if (!code) {
      return redirectWithStatus(request, returnTo, {
        gd_error: "missing_code",
      });
    }

    const tokens = await exchangeGoogleAuthCodeForTokens(code);
    if (!tokens.accessToken) {
      throw new Error("Google did not return an access token.");
    }

    let existingConnection = null;

    try {
      existingConnection = await prisma.adminGoogleDriveConnection.findUnique({
        where: {
          adminId: admin.id,
        },
        select: {
          refreshTokenEncrypted: true,
          scopes: true,
        },
      });
    } catch (error) {
      if (!isMissingAdminGoogleDriveConnectionTableError(error)) {
        throw error;
      }

      return redirectWithStatus(request, returnTo, {
        gd_error: "migration_required",
      });
    }

    const refreshToken = tokens.refreshToken || "";
    const refreshTokenEncrypted = refreshToken
      ? encryptGoogleDriveRefreshToken(refreshToken)
      : existingConnection?.refreshTokenEncrypted || "";

    if (!refreshTokenEncrypted) {
      return redirectWithStatus(request, returnTo, {
        gd_error: "refresh_token_missing",
      });
    }

    const profile = await fetchGoogleDriveUserProfile(tokens.accessToken);
    const googleEmail = profile.email || "";

    if (!googleEmail) {
      throw new Error("Google account email was not returned.");
    }

    try {
      await prisma.adminGoogleDriveConnection.upsert({
        where: {
          adminId: admin.id,
        },
        create: {
          adminId: admin.id,
          googleUserId: profile.googleUserId || googleEmail,
          googleEmail,
          googleDisplayName: profile.displayName || null,
          refreshTokenEncrypted,
          scopes: tokens.scope || existingConnection?.scopes || null,
        },
        update: {
          googleUserId: profile.googleUserId || googleEmail,
          googleEmail,
          googleDisplayName: profile.displayName || null,
          refreshTokenEncrypted,
          scopes: tokens.scope || existingConnection?.scopes || null,
        },
      });
    } catch (error) {
      if (!isMissingAdminGoogleDriveConnectionTableError(error)) {
        throw error;
      }

      return redirectWithStatus(request, returnTo, {
        gd_error: "migration_required",
      });
    }

    return redirectWithStatus(request, returnTo, {
      gd_connected: "1",
    });
  } catch (error) {
    console.error("Google Drive callback handling failed", error);
    return redirectWithStatus(request, returnTo, {
      gd_error: "callback_failed",
    });
  }
}
