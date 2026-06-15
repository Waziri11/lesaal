import crypto from "node:crypto";
import { requireEnv } from "./env";
import { decryptSecret, encryptSecret } from "./token-encryption";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const GOOGLE_DRIVE_OAUTH_STATE_COOKIE_NAME = "google_drive_oauth_state";
export const GOOGLE_DRIVE_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_BASE_URL = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function getOAuthConfig() {
  return {
    clientId: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
  };
}

export function getGooglePickerConfig() {
  return {
    developerKey: requireEnv("GOOGLE_DRIVE_DEVELOPER_KEY"),
    appId: requireEnv("GOOGLE_DRIVE_APP_ID"),
  };
}

export function sanitizeAdminReturnPath(rawValue, fallbackPath = "/admin/projects") {
  const value = String(rawValue || "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallbackPath;
  }

  if (!value.startsWith("/admin")) {
    return fallbackPath;
  }

  return value;
}

function getOAuthStateSigningSecret() {
  return requireEnv("CSRF_SECRET");
}

function signOAuthStatePayload(payload) {
  return crypto.createHmac("sha256", getOAuthStateSigningSecret()).update(payload).digest("base64url");
}

export function createGoogleDriveOAuthState({ nonce, returnTo }) {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: String(nonce || ""),
      returnTo: sanitizeAdminReturnPath(returnTo),
      issuedAt: Date.now(),
    }),
    "utf8"
  ).toString("base64url");
  const signature = signOAuthStatePayload(payload);
  return `${payload}.${signature}`;
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseAndVerifyGoogleDriveOAuthState(serializedState) {
  const [payload = "", signature = ""] = String(serializedState || "").split(".", 2);
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signOAuthStatePayload(payload);
  if (!timingSafeEqual(expectedSignature, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const nonce = String(parsed?.nonce || "").trim();
    const returnTo = sanitizeAdminReturnPath(parsed?.returnTo);
    const issuedAt = Number(parsed?.issuedAt || 0);

    if (!nonce || !Number.isFinite(issuedAt)) {
      return null;
    }

    const maxAgeMs = GOOGLE_DRIVE_OAUTH_STATE_MAX_AGE_SECONDS * 1000;
    if (Date.now() - issuedAt > maxAgeMs) {
      return null;
    }

    return { nonce, returnTo, issuedAt };
  } catch {
    return null;
  }
}

export function buildGoogleDriveAuthorizationUrl({ state }) {
  const { clientId, redirectUri } = getOAuthConfig();
  const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", String(state || ""));
  return url.toString();
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseGoogleErrorMessage(payload, fallbackMessage) {
  const errorDescription = String(payload?.error_description || "").trim();
  if (errorDescription) {
    return errorDescription;
  }

  const nestedErrorMessage = String(payload?.error?.message || "").trim();
  if (nestedErrorMessage) {
    return nestedErrorMessage;
  }

  const error = String(payload?.error || "").trim();
  if (error) {
    return error;
  }

  return fallbackMessage;
}

async function ensureGoogleOk(response, fallbackMessage) {
  if (response.ok) {
    const payload = await parseJsonSafe(response);
    return payload || {};
  }

  const payload = await parseJsonSafe(response);
  const message = parseGoogleErrorMessage(payload, fallbackMessage);
  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  throw error;
}

export async function exchangeGoogleAuthCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  const form = new URLSearchParams({
    code: String(code || ""),
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const payload = await ensureGoogleOk(response, "Unable to complete Google authorization.");
  return {
    accessToken: String(payload?.access_token || ""),
    refreshToken: String(payload?.refresh_token || ""),
    expiresIn: Number(payload?.expires_in || 0),
    tokenType: String(payload?.token_type || ""),
    scope: String(payload?.scope || ""),
  };
}

export async function refreshGoogleAccessToken(refreshToken) {
  const { clientId, clientSecret } = getOAuthConfig();
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: String(refreshToken || ""),
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const payload = await ensureGoogleOk(response, "Unable to refresh Google Drive access.");
  return {
    accessToken: String(payload?.access_token || ""),
    expiresIn: Number(payload?.expires_in || 0),
    tokenType: String(payload?.token_type || ""),
    scope: String(payload?.scope || ""),
  };
}

export async function fetchGoogleDriveUserProfile(accessToken) {
  const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/about`);
  url.searchParams.set("fields", "user(displayName,emailAddress,permissionId,photoLink)");
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${String(accessToken || "")}`,
    },
  });

  const payload = await ensureGoogleOk(response, "Unable to load Google account profile.");
  const user = payload?.user || {};

  return {
    googleUserId: String(user?.permissionId || ""),
    email: String(user?.emailAddress || ""),
    displayName: String(user?.displayName || ""),
    photoUrl: String(user?.photoLink || ""),
  };
}

export async function validateGoogleDriveFolder({ accessToken, folderId }) {
  const id = encodeURIComponent(String(folderId || "").trim());
  const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/files/${id}`);
  url.searchParams.set("fields", "id,name,mimeType,webViewLink");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${String(accessToken || "")}`,
    },
  });

  const payload = await ensureGoogleOk(response, "Unable to validate selected Drive folder.");

  if (payload?.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
    throw new Error("Selected item is not a Google Drive folder.");
  }

  return {
    id: String(payload?.id || ""),
    name: String(payload?.name || ""),
    url: String(payload?.webViewLink || ""),
  };
}

function escapeDriveQueryLiteral(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function listGoogleDriveFolderFiles({ accessToken, folderId, pageToken = "", pageSize = 40, query = "" }) {
  const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 40, 1), 100);
  const url = new URL(`${GOOGLE_DRIVE_API_BASE_URL}/files`);
  const escapedFolderId = escapeDriveQueryLiteral(folderId);
  const escapedQuery = escapeDriveQueryLiteral(query);
  const filters = [`'${escapedFolderId}' in parents`, "trashed = false"];

  if (escapedQuery) {
    filters.push(`name contains '${escapedQuery}'`);
  }

  url.searchParams.set("q", filters.join(" and "));
  url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink)");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", String(normalizedPageSize));
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  if (pageToken) {
    url.searchParams.set("pageToken", String(pageToken));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${String(accessToken || "")}`,
    },
  });

  const payload = await ensureGoogleOk(response, "Unable to load folder files from Google Drive.");
  const files = Array.isArray(payload?.files) ? payload.files : [];

  return {
    files: files.map((file) => ({
      id: String(file?.id || ""),
      name: String(file?.name || ""),
      mimeType: String(file?.mimeType || ""),
      size: file?.size == null ? null : Number(file.size),
      modifiedTime: String(file?.modifiedTime || ""),
      webViewLink: String(file?.webViewLink || ""),
      webContentLink: String(file?.webContentLink || ""),
      iconLink: String(file?.iconLink || ""),
      thumbnailLink: String(file?.thumbnailLink || ""),
    })),
    nextPageToken: String(payload?.nextPageToken || ""),
  };
}

export async function uploadFileToGoogleDriveFolder({ accessToken, folderId, fileName, mimeType, buffer }) {
  const metadata = {
    name: String(fileName || "Untitled"),
    parents: [String(folderId || "")],
  };
  const fileBytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const contentType = String(mimeType || "").trim() || "application/octet-stream";
  const boundary = `lesaal-drive-upload-${crypto.randomBytes(8).toString("hex")}`;
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    "utf8"
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([prefix, fileBytes, suffix]);
  const url = new URL(`${GOOGLE_DRIVE_UPLOAD_BASE_URL}/files`);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("fields", "id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${String(accessToken || "")}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const payload = await ensureGoogleOk(response, "Unable to upload file to Google Drive.");

  return {
    id: String(payload?.id || ""),
    name: String(payload?.name || ""),
    mimeType: String(payload?.mimeType || ""),
    size: payload?.size == null ? null : Number(payload.size),
    modifiedTime: String(payload?.modifiedTime || ""),
    webViewLink: String(payload?.webViewLink || ""),
    webContentLink: String(payload?.webContentLink || ""),
    iconLink: String(payload?.iconLink || ""),
    thumbnailLink: String(payload?.thumbnailLink || ""),
  };
}

export function encryptGoogleDriveRefreshToken(refreshToken) {
  return encryptSecret(refreshToken);
}

export function decryptGoogleDriveRefreshToken(encryptedRefreshToken) {
  return decryptSecret(encryptedRefreshToken);
}
