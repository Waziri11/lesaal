function toInteger(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function toBoolean(value, fallbackValue = false) {
  if (value == null) return fallbackValue;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallbackValue;

  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return fallbackValue;
}

export function requireEnv(name) {
  const value = process.env[name];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function getEnvInteger(name, fallbackValue) {
  return toInteger(process.env[name], fallbackValue);
}

export function getEnvBoolean(name, fallbackValue = false) {
  return toBoolean(process.env[name], fallbackValue);
}
