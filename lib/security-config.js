import { getEnvInteger, requireEnv } from "./env";

function toPositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

export function getSecurityConfig() {
  return {
    csrfSecret: requireEnv("CSRF_SECRET"),
    turnstileSecretKey: requireEnv("TURNSTILE_SECRET_KEY"),
    turnstileSiteKey: requireEnv("TURNSTILE_SITE_KEY"),
    rateLimitWindowMinutes: toPositiveInt(getEnvInteger("RATE_LIMIT_WINDOW_MINUTES", 15), 15),
    rateLimitMaxLoginIp: toPositiveInt(getEnvInteger("RATE_LIMIT_MAX_LOGIN_IP", 10), 10),
    rateLimitMaxLoginEmail: toPositiveInt(getEnvInteger("RATE_LIMIT_MAX_LOGIN_EMAIL", 5), 5),
    rateLimitMaxPublicIp: toPositiveInt(getEnvInteger("RATE_LIMIT_MAX_PUBLIC_IP", 30), 30),
    rateLimitMaxPublicCampaignIp: toPositiveInt(getEnvInteger("RATE_LIMIT_MAX_PUBLIC_CAMPAIGN_IP", 10), 10),
    rateLimitMaxOtpRequests: toPositiveInt(getEnvInteger("RATE_LIMIT_MAX_OTP_REQUESTS", 3), 3),
  };
}

