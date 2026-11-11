import { InstrumentQuote, MarketType } from "../types";

const parsePositiveNumber = (value: number | string | undefined): number | undefined => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

export const applyLimit = (items: InstrumentQuote[], limit?: number | string): InstrumentQuote[] => {
  const parsed = parsePositiveNumber(limit);

  if (!parsed) {
    return items;
  }

  return items.slice(0, Math.floor(parsed));
};

export const parseThreshold = (value: number | string | undefined, fallback = 1): number => {
  const parsed = parsePositiveNumber(value);

  if (!parsed) {
    return fallback;
  }

  return parsed;
};

export const findMarketAlerts = (
  items: InstrumentQuote[],
  threshold: number,
  limit?: number | string
): InstrumentQuote[] => {
  const filtered = items
    .filter((item) => Math.abs(item.changePercent) >= threshold)
    .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent));

  return applyLimit(filtered, limit);
};

export const buildAlertsFingerprint = (market: MarketType, alerts: InstrumentQuote[]): string => {
  if (alerts.length === 0) {
    return `${market}:none`;
  }

  const rows = alerts.map((item) => `${item.symbol}:${Math.round(item.changePercent * 100)}`);
  return `${market}:${rows.join("|")}`;
};
