import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "../../../../lib/auth";
import { ensureDatabaseReady, prisma } from "../../../../lib/prisma";
import { hashToken } from "../../../../lib/security";
import { SESSION_COOKIE_NAME } from "../../../../lib/constants";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    await ensureDatabaseReady();

    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (rawToken) {
      await prisma.adminSession.deleteMany({
        where: {
          tokenHash: hashToken(rawToken),
        },
      });
    }

    const response = NextResponse.json({ success: true });
    clearAdminSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Logout failed", error);
    const response = NextResponse.json({ error: "Unable to logout." }, { status: 500 });
    clearAdminSessionCookie(response);
    return response;
  }
}
