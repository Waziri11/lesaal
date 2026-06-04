import { cookies } from "next/headers";
import { ensureDatabaseReady, prisma } from "./prisma";
import { hashToken } from "./security";
import { SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from "./constants";

export function createSessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  return expiresAt;
}

export async function getAdminSessionByToken(rawToken) {
  if (!rawToken) return null;

  await ensureDatabaseReady();

  const tokenHash = hashToken(rawToken);

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: {
      admin: true,
    },
  });

  return session;
}

export async function getAdminFromApiRequest(request) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await getAdminSessionByToken(rawToken);
  return session?.admin || null;
}

export async function getAuthenticatedAdminFromCookies() {
  const cookieStore = cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await getAdminSessionByToken(rawToken);
  return session?.admin || null;
}

export function setAdminSessionCookie(response, token, expiresAt) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearAdminSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
