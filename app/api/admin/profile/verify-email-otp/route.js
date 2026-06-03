import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { hashToken } from "../../../../../lib/security";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newEmail = String(body?.newEmail || "").trim().toLowerCase();
    const otp = String(body?.otp || "").trim();

    if (!newEmail || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const code = await prisma.emailOtpCode.findFirst({
      where: {
        adminId: admin.id,
        email: newEmail,
        usedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!code) {
      return NextResponse.json({ error: "No active OTP found. Request a new code." }, { status: 400 });
    }

    if (code.expiresAt <= new Date()) {
      return NextResponse.json({ error: "OTP has expired. Request a new code." }, { status: 400 });
    }

    if (code.attempts >= code.maxAttempts) {
      return NextResponse.json({ error: "Too many failed attempts. Request a new code." }, { status: 400 });
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

      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    const emailInUse = await prisma.adminUser.findFirst({
      where: {
        email: newEmail,
        id: { not: admin.id },
      },
    });

    if (emailInUse) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: admin.id },
        data: { email: newEmail },
      }),
      prisma.emailOtpCode.update({
        where: { id: code.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true, email: newEmail });
  } catch (error) {
    console.error("Failed to verify email OTP", error);
    return NextResponse.json({ error: "Unable to verify OTP." }, { status: 500 });
  }
}
