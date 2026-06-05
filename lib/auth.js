import { cookies } from "next/headers";
import { ensureDatabaseReady, prisma } from "./prisma";
import { hashToken } from "./security";
import { SESSION_COOKIE_LIFETIME_DAYS, SESSION_COOKIE_NAME, SESSION_IDLE_TIMEOUT_MINUTES } from "./constants";

export function createSessionExpiryDate(fromDate = new Date()) {
  const expiresAt = new Date(fromDate);
  expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_IDLE_TIMEOUT_MINUTES);
  return expiresAt;
}

export function createSessionCookieExpiryDate(fromDate = new Date()) {
  const expiresAt = new Date(fromDate);
  expiresAt.setDate(expiresAt.getDate() + SESSION_COOKIE_LIFETIME_DAYS);
  return expiresAt;
}

export async function getAdminSessionByToken(rawToken) {
  if (!rawToken) return null;

  await ensureDatabaseReady();

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
    },
    include: {
      admin: true,
    },
  });

  if (!session) {
    return null;
  }

  const refreshedExpiresAt = createSessionExpiryDate(now);

  await prisma.adminSession.update({
    where: { id: session.id },
    data: {
      expiresAt: refreshedExpiresAt,
    },
  });

  return {
    ...session,
    expiresAt: refreshedExpiresAt,
  };
}


export async function getAdminFromApiRequest(request) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await getAdminSessionByToken(rawToken);
  return session?.admin || null;
}

export async function getAuthenticatedAdminFromCookies() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await getAdminSessionByToken(rawToken);
  return session?.admin || null;
}

export function setAdminSessionCookie(response, token, expiresAt = createSessionCookieExpiryDate()) {
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
