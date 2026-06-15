import { prisma } from "./prisma";
import { decryptGoogleDriveRefreshToken, refreshGoogleAccessToken } from "./google-drive";
import {
  ADMIN_GOOGLE_DRIVE_CONNECTION_SELECT,
  isMissingAdminGoogleDriveConnectionTableError,
} from "./project-repository";

export async function loadGoogleDriveConnectionForAdmin(adminId) {
  return prisma.adminGoogleDriveConnection.findUnique({
    where: { adminId: String(adminId || "") },
    select: ADMIN_GOOGLE_DRIVE_CONNECTION_SELECT,
  });
}

export async function getGoogleDriveAccessContextForAdmin(adminId) {
  const connection = await loadGoogleDriveConnectionForAdmin(adminId);

  if (!connection) {
    return null;
  }

  const refreshToken = decryptGoogleDriveRefreshToken(connection.refreshTokenEncrypted);
  const token = await refreshGoogleAccessToken(refreshToken);

  return {
    connection,
    accessToken: token.accessToken,
    scope: token.scope,
    expiresIn: token.expiresIn,
  };
}

export function isGoogleDriveConnectionMissingSchemaError(error) {
  return isMissingAdminGoogleDriveConnectionTableError(error);
}

export function isGoogleOAuthReauthRequiredError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("invalid_grant") ||
    message.includes("token has been expired or revoked") ||
    message.includes("unauthorized_client")
  );
}
