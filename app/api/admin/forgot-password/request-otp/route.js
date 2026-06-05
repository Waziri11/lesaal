import { NextResponse } from "next/server";
import { OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS } from "../../../../../lib/constants";
import { prisma } from "../../../../../lib/prisma";
import { verifyTurnstileToken } from "../../../../../lib/captcha";
import { sendPasswordResetOtpEmail } from "../../../../../lib/mailer";
import { consumeRateLimit } from "../../../../../lib/rate-limit";
import { getClientIpAddress } from "../../../../../lib/request-utils";
import { createRateLimitResponse, validateAdminMutationRequest } from "../../../../../lib/request-security";
import { getSecurityConfig } from "../../../../../lib/security-config";
import { generateOtpCode, hashToken } from "../../../../../lib/security";

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
    const captchaToken = String(body?.captchaToken || "").trim();

    if (!email || !captchaToken) {
      return NextResponse.json({ error: "Email and captcha are required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const clientIp = getClientIpAddress(request);
    const { rateLimitWindowMinutes, rateLimitMaxOtpRequests } = getSecurityConfig();
    const otpRequestRateLimit = await consumeRateLimit({
      key: `admin-forgot-password-request:${email}:${clientIp}`,
      limit: rateLimitMaxOtpRequests,
      windowMs: rateLimitWindowMinutes * 60 * 1000,
    });

    if (!otpRequestRateLimit.allowed) {
      return createRateLimitResponse(
        "Too many reset code requests. Please wait before requesting another code.",
        otpRequestRateLimit.retryAfterSeconds
      );
    }

    const captchaResult = await verifyTurnstileToken({ token: captchaToken, remoteIp: clientIp });

    if (!captchaResult.success) {
      return NextResponse.json({ error: "Captcha validation failed." }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (admin) {
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await prisma.emailOtpCode.updateMany({
        where: {
          adminId: admin.id,
          email,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await prisma.emailOtpCode.create({
        data: {
          adminId: admin.id,
          email,
          codeHash: hashToken(otpCode),
          expiresAt,
          maxAttempts: OTP_MAX_ATTEMPTS,
        },
      });

      await sendPasswordResetOtpEmail({ to: email, otpCode });
    }

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Failed to request password reset OTP", error);
    return NextResponse.json({ error: "Unable to send reset code right now." }, { status: 500 });
  }
}
