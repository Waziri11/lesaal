import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createSessionExpiryDate, setAdminSessionCookie } from "../../../../lib/auth";
import { generateSessionToken, hashToken, verifyPassword } from "../../../../lib/security";
import { ensureEnvSeededAdminExists } from "../../../../lib/admin-bootstrap";

export async function POST(request) {
  try {
    await ensureEnvSeededAdminExists();

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });

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

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });

    setAdminSessionCookie(response, rawToken, expiresAt);

    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to login right now." }, { status: 500 });
  }
}
