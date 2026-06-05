import { NextResponse } from "next/server";
import { OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS } from "../../../../../lib/constants";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { generateOtpCode, hashToken, verifyPassword } from "../../../../../lib/security";
import { sendOtpEmail } from "../../../../../lib/mailer";
import { consumeRateLimit } from "../../../../../lib/rate-limit";
import { getClientIpAddress } from "../../../../../lib/request-utils";
import { createRateLimitResponse, validateAdminMutationRequest } from "../../../../../lib/request-security";
import { getSecurityConfig } from "../../../../../lib/security-config";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body?.currentPassword || "");
    const newEmail = String(body?.newEmail || "").trim().toLowerCase();

    if (!currentPassword || !newEmail) {
      return NextResponse.json({ error: "Current password and new email are required." }, { status: 400 });
    }

    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const clientIp = getClientIpAddress(request);
    const { rateLimitWindowMinutes, rateLimitMaxOtpRequests } = getSecurityConfig();
    const otpRequestRateLimit = await consumeRateLimit({
      key: `admin-otp-request:${admin.id}:${newEmail}:${clientIp}`,
      limit: rateLimitMaxOtpRequests,
      windowMs: rateLimitWindowMinutes * 60 * 1000,
    });

    if (!otpRequestRateLimit.allowed) {
      return createRateLimitResponse(
        "Too many OTP requests. Please wait before requesting another code.",
        otpRequestRateLimit.retryAfterSeconds
      );
    }

    if (newEmail === admin.email) {
      return NextResponse.json({ error: "New email must be different from current email." }, { status: 400 });
    }

    const currentAdmin = await prisma.adminUser.findUnique({ where: { id: admin.id } });

    if (!currentAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(currentPassword, currentAdmin.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const emailInUse = await prisma.adminUser.findFirst({ where: { email: newEmail } });

    if (emailInUse) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.emailOtpCode.updateMany({
      where: {
        adminId: admin.id,
        email: newEmail,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await prisma.emailOtpCode.create({
      data: {
        adminId: admin.id,
        email: newEmail,
        codeHash: hashToken(otpCode),
        expiresAt,
        maxAttempts: OTP_MAX_ATTEMPTS,
      },
    });

    const mailResult = await sendOtpEmail({ to: newEmail, otpCode });

    return NextResponse.json({
      success: true,
      delivered: mailResult.delivered,
      note: mailResult.delivered ? null : "SMTP not configured. OTP email was not sent.",
    });
  } catch (error) {
    console.error("Failed to request email OTP", error);
    return NextResponse.json({ error: "Unable to send OTP." }, { status: 500 });
  }
}
