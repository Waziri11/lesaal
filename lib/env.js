function toInteger(value, fallbackValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
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

