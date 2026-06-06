import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createSessionCookieExpiryDate, createSessionExpiryDate, setAdminSessionCookie } from "../../../../lib/auth";
import { generateSessionToken, hashToken, verifyPassword } from "../../../../lib/security";
import { ensureEnvSeededAdminExists } from "../../../../lib/admin-bootstrap";
import { verifyTurnstileToken } from "../../../../lib/captcha";
import { consumeRateLimit, clearRateLimit } from "../../../../lib/rate-limit";
import { getClientIpAddress } from "../../../../lib/request-utils";
import { createRateLimitResponse, validateAdminMutationRequest } from "../../../../lib/request-security";
import { getSecurityConfig } from "../../../../lib/security-config";
import { isAdminProfileComplete } from "../../../../lib/admin-profile";

const ADMIN_LOGIN_SELECT = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  companyName: true,
  companyDescription: true,
  profileImageUrl: true,
  gender: true,
  region: true,
  district: true,
  ward: true,
};

const ADMIN_LOGIN_SELECT_LEGACY = {
  id: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  companyName: true,
  companyDescription: true,
  gender: true,
  region: true,
  district: true,
  ward: true,
};

function isMissingProfileImageColumnError(error) {
  if (!error) return false;

  const message = String(error?.message || "").toLowerCase();
  return error?.code === "P2022" && message.includes("profileimageurl");
}

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    await ensureEnvSeededAdminExists();

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const captchaToken = String(body?.captchaToken || "").trim();

    if (!email || !password || !captchaToken) {
      return NextResponse.json({ error: "Email, password, and captcha are required." }, { status: 400 });
    }

    const clientIp = getClientIpAddress(request);
    const {
      rateLimitWindowMinutes,
      rateLimitMaxLoginIp,
      rateLimitMaxLoginEmail,
    } = getSecurityConfig();
    const windowMs = rateLimitWindowMinutes * 60 * 1000;
    const lockMs = 30 * 60 * 1000;
    const ipKey = `admin-login:ip:${clientIp}`;
    const emailKey = `admin-login:email:${email}`;

    const [ipRateLimit, emailRateLimit] = await Promise.all([
      consumeRateLimit({
        key: ipKey,
        limit: rateLimitMaxLoginIp,
        windowMs,
        lockMs,
      }),
      consumeRateLimit({
        key: emailKey,
        limit: rateLimitMaxLoginEmail,
        windowMs,
        lockMs,
      }),
    ]);

    if (!ipRateLimit.allowed || !emailRateLimit.allowed) {
      const retryAfterSeconds = Math.max(ipRateLimit.retryAfterSeconds, emailRateLimit.retryAfterSeconds);
      return createRateLimitResponse("Too many login attempts. Please try again later.", retryAfterSeconds);
    }

    const captchaResult = await verifyTurnstileToken({ token: captchaToken, remoteIp: clientIp });

    if (!captchaResult.success) {
      return NextResponse.json({ error: "Captcha validation failed." }, { status: 400 });
    }

    let admin;

    try {
      admin = await prisma.adminUser.findUnique({
        where: { email },
        select: ADMIN_LOGIN_SELECT,
      });
    } catch (error) {
      if (!isMissingProfileImageColumnError(error)) {
        throw error;
      }

      // Backward-compatibility while pending profile image DB migration.
      admin = await prisma.adminUser.findUnique({
        where: { email },
        select: ADMIN_LOGIN_SELECT_LEGACY,
      });
    }

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, admin.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = createSessionExpiryDate();

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        tokenHash,
        expiresAt,
      },
    });

    await prisma.adminSession.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });

    await Promise.all([clearRateLimit(ipKey), clearRateLimit(emailKey)]);

    const response = NextResponse.json({
      success: true,
      requiresProfileSetup: !isAdminProfileComplete(admin),
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        companyName: admin.companyName,
      },
    });

    setAdminSessionCookie(response, rawToken, createSessionCookieExpiryDate());

    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to login right now." }, { status: 500 });
  }
}
