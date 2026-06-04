import { ensureDatabaseReady, prisma } from "./prisma";
import { hashPassword } from "./security";

export async function ensureEnvSeededAdminExists() {
  await ensureDatabaseReady();

  const adminCount = await prisma.adminUser.count();

  if (adminCount > 0) {
    return null;
  }

  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !password || password.length < 8) {
    return null;
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
    },
  });

  return admin;
}
