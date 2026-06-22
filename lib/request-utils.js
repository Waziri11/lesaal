import crypto from "node:crypto";
import { isIP } from "node:net";
import { getEnvBoolean } from "./env";

function toHeaderValue(value, maxLength = 256) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizePossibleIp(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (isIP(trimmed)) {
    return trimmed;
  }

  // Handle IPv4 values forwarded as "x.x.x.x:port".
  if (trimmed.includes(":")) {
    const ipv4Candidate = trimmed.split(":")[0]?.trim();
    if (ipv4Candidate && isIP(ipv4Candidate) === 4) {
      return ipv4Candidate;
    }
  }

  return "";
}

function shouldTrustProxyHeaders() {
  return getEnvBoolean("TRUST_PROXY_HEADERS", false);
}

function getFirstValidForwardedIp(request) {
  const candidates = [];
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    for (const entry of String(forwardedFor).split(",")) {
      candidates.push(entry);
    }
  }

  candidates.push(request.headers.get("x-real-ip"));
  candidates.push(request.headers.get("cf-connecting-ip"));
  candidates.push(request.headers.get("x-vercel-forwarded-for"));

  for (const candidate of candidates) {
    const normalized = normalizePossibleIp(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

export function getClientIpAddress(request) {
  const directIp = normalizePossibleIp(request?.ip);
  if (directIp) {
    return directIp;
  }

  if (shouldTrustProxyHeaders()) {
    const forwardedIp = getFirstValidForwardedIp(request);
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return "unknown";
}

export function getRequestRateLimitIdentity(request) {
  const clientIp = getClientIpAddress(request);

  if (clientIp !== "unknown") {
    return {
      clientIp,
      keyPart: `ip:${clientIp}`,
    };
  }

  const userAgent = toHeaderValue(request.headers.get("user-agent"), 180) || "unknown";
  const language = toHeaderValue(request.headers.get("accept-language"), 80) || "unknown";
  const fallbackFingerprint = crypto
    .createHash("sha256")
    .update(`${userAgent}|${language}`)
    .digest("hex")
    .slice(0, 24);

  return {
    clientIp: "unknown",
    keyPart: `anon:${fallbackFingerprint}`,
  };
}
