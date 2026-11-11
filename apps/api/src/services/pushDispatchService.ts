import { config } from "../config";
import { MarketType } from "../types";
import { buildAlertsFingerprint, findMarketAlerts } from "./alertsService";
import { getMarketData } from "./marketDataService";
import { getSubscribersForMarket, unregisterSubscription } from "./pushSubscriptionStore";

export interface DispatchMarketAlertsOptions {
  market: MarketType;
  threshold?: number;
  limit?: number;
  force?: boolean;
}

export interface DispatchMarketAlertsResult {
  market: MarketType;
  threshold: number;
  source: "finnhub" | "mock";
  warning?: string;
  subscribers: number;
  alerts: number;
  sent: number;
  skipped: "none" | "no-subscribers" | "no-alerts" | "unchanged" | "push-disabled";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  details?: {
    error?: string;
  };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
}

interface ExpoPushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: {
    market: MarketType;
    generatedAt: string;
    threshold: number;
  };
}

const lastFingerprintByMarket: Partial<Record<MarketType, string>> = {};

let autoDispatchHandle: NodeJS.Timeout | null = null;
let autoDispatchBusy = false;

const chunk = <T>(items: T[], size: number): T[][] => {
  const parts: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    parts.push(items.slice(index, index + size));
  }

  return parts;
};

const marketLabel = (market: MarketType): string => (market === "mx" ? "México" : "Global");

const movement = (value: number): string => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const buildNotification = (
  market: MarketType,
  threshold: number,
  firstSymbol: string,
  firstMovement: number,
  alertCount: number
): Omit<ExpoPushMessage, "to"> => {
  if (threshold <= 0) {
    return {
      sound: "default",
      title: `Actualización ${marketLabel(market)}`,
      body: `${firstSymbol} ${movement(firstMovement)} · ${alertCount} símbolo(s) revisados`,
      data: {
        market,
        generatedAt: new Date().toISOString(),
        threshold
      }
    };
  }

  return {
    sound: "default",
    title: `Alerta ${marketLabel(market)} (${alertCount})`,
    body: `${firstSymbol} ${movement(firstMovement)} · Umbral ±${threshold.toFixed(2)}%`,
    data: {
      market,
      generatedAt: new Date().toISOString(),
      threshold
    }
  };
};

const sendPushMessages = async (
  tokens: string[],
  payload: Omit<ExpoPushMessage, "to">
): Promise<number> => {
  if (tokens.length === 0) {
    return 0;
  }

  let sentCount = 0;

  for (const tokenChunk of chunk(tokens, 100)) {
    const messages: ExpoPushMessage[] = tokenChunk.map((token) => ({
      to: token,
      ...payload
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed: ${response.status}`);
    }

    const body = (await response.json()) as ExpoPushResponse;
    const tickets = body.data ?? [];

    tickets.forEach((ticket, index) => {
      if (ticket.status === "ok") {
        sentCount += 1;
        return;
      }

      const token = tokenChunk[index];

      if (ticket.details?.error === "DeviceNotRegistered") {
        unregisterSubscription(token);
      }
    });
  }

  return sentCount;
};

export const dispatchMarketAlerts = async (
  options: DispatchMarketAlertsOptions
): Promise<DispatchMarketAlertsResult> => {
  const threshold = options.threshold ?? config.pushAlertThreshold;
  const limit = options.limit ?? config.pushAlertLimit;

  const marketData = await getMarketData(options.market);
  const subscribers = getSubscribersForMarket(options.market);
  const alerts = findMarketAlerts(marketData.data, threshold, limit);

  if (!config.expoPushEnabled) {
    return {
      market: options.market,
      threshold,
      source: marketData.source,
      warning: marketData.warning,
      subscribers: subscribers.length,
      alerts: alerts.length,
      sent: 0,
      skipped: "push-disabled"
    };
  }

  if (subscribers.length === 0) {
    return {
      market: options.market,
      threshold,
      source: marketData.source,
      warning: marketData.warning,
      subscribers: 0,
      alerts: alerts.length,
      sent: 0,
      skipped: "no-subscribers"
    };
  }

  if (alerts.length === 0) {
    lastFingerprintByMarket[options.market] = `${options.market}:none`;

    return {
      market: options.market,
      threshold,
      source: marketData.source,
      warning: marketData.warning,
      subscribers: subscribers.length,
      alerts: 0,
      sent: 0,
      skipped: "no-alerts"
    };
  }

  const fingerprint = buildAlertsFingerprint(options.market, alerts);

  if (!options.force && lastFingerprintByMarket[options.market] === fingerprint) {
    return {
      market: options.market,
      threshold,
      source: marketData.source,
      warning: marketData.warning,
      subscribers: subscribers.length,
      alerts: alerts.length,
      sent: 0,
      skipped: "unchanged"
    };
  }

  const payload = buildNotification(
    options.market,
    threshold,
    alerts[0].symbol,
    alerts[0].changePercent,
    alerts.length
  );

  const sent = await sendPushMessages(subscribers, payload);

  lastFingerprintByMarket[options.market] = fingerprint;

  return {
    market: options.market,
    threshold,
    source: marketData.source,
    warning: marketData.warning,
    subscribers: subscribers.length,
    alerts: alerts.length,
    sent,
    skipped: "none"
  };
};

const runAutoDispatchCycle = async (onError?: (error: unknown) => void): Promise<void> => {
  if (autoDispatchBusy) {
    return;
  }

  autoDispatchBusy = true;

  try {
    await Promise.all([
      dispatchMarketAlerts({ market: "mx", threshold: 0, force: true, limit: 100 }),
      dispatchMarketAlerts({ market: "global", threshold: 0, force: true, limit: 100 })
    ]);
  } catch (error) {
    if (onError) {
      onError(error);
    }
  } finally {
    autoDispatchBusy = false;
  }
};

export const startAutoDispatch = (onError?: (error: unknown) => void): void => {
  if (!config.pushAutoDispatchEnabled || autoDispatchHandle) {
    return;
  }

  autoDispatchHandle = setInterval(() => {
    void runAutoDispatchCycle(onError);
  }, config.pushDispatchIntervalMs);

  void runAutoDispatchCycle(onError);
};

export const stopAutoDispatch = (): void => {
  if (!autoDispatchHandle) {
    return;
  }

  clearInterval(autoDispatchHandle);
  autoDispatchHandle = null;
};
