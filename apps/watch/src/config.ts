const parseThreshold = (value: string | undefined): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
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

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export const ALERT_THRESHOLD = parseThreshold(process.env.EXPO_PUBLIC_ALERT_THRESHOLD);
export const ENABLE_REMOTE_PUSH = parseBoolean(process.env.EXPO_PUBLIC_ENABLE_REMOTE_PUSH, true);
