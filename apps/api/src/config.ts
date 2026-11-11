import fs from "node:fs";
import path from "node:path";

const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim();

  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const applyEnvFile = (filePath: string): void => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const normalized = line.trim();

    if (!normalized || normalized.startsWith("#")) {
      return;
    }

    const separator = normalized.indexOf("=");

    if (separator <= 0) {
      return;
    }

    const key = normalized.slice(0, separator).trim();
    const rawValue = normalized.slice(separator + 1);

    if (!key || process.env[key] !== undefined) {
      return;
    }

    process.env[key] = stripWrappingQuotes(rawValue);
  });
};

const bootstrapEnv = (): void => {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/api/.env"),
    path.resolve(__dirname, "../.env")
  ];

  candidates.forEach((candidate) => applyEnvFile(candidate));
};

bootstrapEnv();

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 4000;
  }

  return parsed;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
  min = 1,
  max = 10_000
): number => {
  const parsed = Math.floor(parseNumber(value, fallback));

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
};

const parsePositiveFloat = (value: string | undefined, fallback: number): number => {
  const parsed = parseNumber(value, fallback);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const config = {
  port: parsePort(process.env.PORT),
  finnhubApiKey: (process.env.FINNHUB_API_KEY ?? "").trim(),
  marketCacheTtlMs: parsePositiveInt(process.env.MARKET_CACHE_TTL_MS, 55_000, 1, 3_600_000),
  expoPushEnabled: parseBoolean(process.env.EXPO_PUSH_ENABLED, true),
  pushAutoDispatchEnabled: parseBoolean(process.env.PUSH_AUTO_DISPATCH_ENABLED, true),
  pushDispatchIntervalMs: parsePositiveInt(process.env.PUSH_DISPATCH_INTERVAL_MS, 60_000, 10_000, 3_600_000),
  pushAlertThreshold: parsePositiveFloat(process.env.PUSH_ALERT_THRESHOLD, 1),
  pushAlertLimit: parsePositiveInt(process.env.PUSH_ALERT_LIMIT, 5, 1, 20)
};
