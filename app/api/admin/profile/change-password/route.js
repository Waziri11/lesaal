import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { hashPassword, verifyPassword } from "../../../../../lib/security";
import { validateAdminMutationRequest } from "../../../../../lib/request-security";

const MIN_PASSWORD_LENGTH = 8;

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
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const currentAdmin = await prisma.adminUser.findUnique({ where: { id: admin.id } });

    if (!currentAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, currentAdmin.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    await prisma.adminSession.deleteMany({
      where: { adminId: admin.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to change password", error);
    return NextResponse.json({ error: "Unable to change password." }, { status: 500 });
  }
}
