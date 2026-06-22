import { NextResponse } from "next/server";
import { OTP_MAX_ATTEMPTS } from "../../../../../lib/constants";
import { prisma } from "../../../../../lib/prisma";
import { verifyTurnstileToken } from "../../../../../lib/captcha";
import { consumeRateLimit } from "../../../../../lib/rate-limit";
import { getRequestRateLimitIdentity } from "../../../../../lib/request-utils";
import { createRateLimitResponse, validateAdminMutationRequest } from "../../../../../lib/request-security";
import { getSecurityConfig } from "../../../../../lib/security-config";
import { hashPassword, hashToken } from "../../../../../lib/security";

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const otp = String(body?.otp || "").trim();
    const newPassword = String(body?.newPassword || "");
    const captchaToken = String(body?.captchaToken || "").trim();

    if (!email || !otp || !newPassword || !captchaToken) {
      return NextResponse.json(
        { error: "Email, OTP code, new password, and captcha are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const requestIdentity = getRequestRateLimitIdentity(request);
    const clientIp = requestIdentity.clientIp;
    const { rateLimitWindowMinutes } = getSecurityConfig();
    const resetRateLimit = await consumeRateLimit({
      key: `admin-forgot-password-reset:${email}:identity:${requestIdentity.keyPart}`,
      limit: OTP_MAX_ATTEMPTS,
      windowMs: rateLimitWindowMinutes * 60 * 1000,
      denyOnMissingTable: true,
    });

    if (!resetRateLimit.allowed) {
      return createRateLimitResponse(
        "Too many reset attempts. Please wait before trying again.",
        resetRateLimit.retryAfterSeconds
      );
    }

    const captchaResult = await verifyTurnstileToken({ token: captchaToken, remoteIp: clientIp });

    if (!captchaResult.success) {
      return NextResponse.json({ error: "Captcha validation failed." }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
    }

    const code = await prisma.emailOtpCode.findFirst({
      where: {
        adminId: admin.id,
        email,
        usedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!code) {
      return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
    }

    if (code.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
    }

    if (code.attempts >= code.maxAttempts) {
      return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
    }

    const matches = hashToken(otp) === code.codeHash;

    if (!matches) {
      await prisma.emailOtpCode.update({
        where: { id: code.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: admin.id },
        data: { passwordHash },
      }),
      prisma.adminSession.deleteMany({
        where: { adminId: admin.id },
      }),
      prisma.emailOtpCode.updateMany({
        where: {
          adminId: admin.id,
          email,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset password with OTP", error);
    return NextResponse.json({ error: "Unable to reset password right now." }, { status: 500 });
  }
}
