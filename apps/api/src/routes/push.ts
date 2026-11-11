import { FastifyInstance } from "fastify";
import { config } from "../config";
import { dispatchMarketAlerts } from "../services/pushDispatchService";
import {
  getSubscriptionStats,
  isValidExpoPushToken,
  registerSubscription,
  unregisterSubscription
} from "../services/pushSubscriptionStore";
import { MarketType } from "../types";

interface RegisterPushBody {
  token: string;
  markets?: MarketType[];
}

interface UnregisterPushBody {
  token: string;
}

const normalizeMarkets = (markets: unknown): MarketType[] => {
  const defaultMarkets: MarketType[] = ["mx", "global"];

  if (!Array.isArray(markets) || markets.length === 0) {
    return defaultMarkets;
  }

  const normalized = markets
    .filter((market): market is string => typeof market === "string")
    .map((market) => market.trim().toLowerCase())
    .filter((market): market is MarketType => market === "mx" || market === "global");

  if (normalized.length === 0) {
    return defaultMarkets;
  }

  return [...new Set(normalized)];
};

const parseOptionalNumber = (value: number | string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const parseForce = (value: boolean | string | undefined): boolean => {
  if (value === true || value === "true" || value === "1") {
    return true;
  }

  return false;
};

const resolveMarket = (value: string): MarketType | null => {
  const market = value?.trim().toLowerCase();

  if (market === "mx" || market === "global") {
    return market;
  }

  return null;
};

const runDispatch = async (
  market: string,
  threshold: number | string | undefined,
  limit: number | string | undefined,
  force: boolean | string | undefined
) => {
  const resolvedMarket = resolveMarket(market);

  if (!resolvedMarket) {
    return {
      valid: false,
      result: {
        message: "Mercado inválido. Usa 'mx' o 'global'."
      }
    } as const;
  }

  const result = await dispatchMarketAlerts({
    market: resolvedMarket,
    threshold: parseOptionalNumber(threshold),
    limit: parseOptionalNumber(limit),
    force: parseForce(force)
  });

  return {
    valid: true,
    result: {
      message: "Dispatch ejecutado.",
      ...result
    }
  } as const;
};

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/push/subscriptions", async () => {
    const stats = getSubscriptionStats();

    return {
      expoPushEnabled: config.expoPushEnabled,
      autoDispatchEnabled: config.pushAutoDispatchEnabled,
      autoDispatchIntervalMs: config.pushDispatchIntervalMs,
      ...stats
    };
  });

  app.post<{ Body: RegisterPushBody }>("/v1/push/register", async (request, reply) => {
    const token = request.body?.token?.trim();

    if (!token || !isValidExpoPushToken(token)) {
      return reply.code(400).send({
        message: "Token Expo inválido."
      });
    }

    const markets = normalizeMarkets(request.body?.markets);
    const record = registerSubscription(token, markets);

    return {
      message: "Suscripción registrada.",
      token: record.token,
      markets: [...record.markets],
      updatedAt: record.updatedAt
    };
  });

  app.post<{ Body: UnregisterPushBody }>("/v1/push/unregister", async (request, reply) => {
    const token = request.body?.token?.trim();

    if (!token) {
      return reply.code(400).send({
        message: "Token requerido."
      });
    }

    const removed = unregisterSubscription(token);

    return {
      message: removed ? "Suscripción removida." : "Token no encontrado.",
      removed
    };
  });

  app.get<{
    Params: { market: string };
    Querystring: { threshold?: number | string; limit?: number | string; force?: boolean | string };
  }>("/v1/push/dispatch/:market", async (request, reply) => {
    const dispatch = await runDispatch(
      request.params.market,
      request.query.threshold,
      request.query.limit,
      request.query.force
    );

    if (!dispatch.valid) {
      return reply.code(400).send(dispatch.result);
    }

    return dispatch.result;
  });

  app.post<{
    Params: { market: string };
    Querystring: { threshold?: number | string; limit?: number | string; force?: boolean | string };
  }>("/v1/push/dispatch/:market", async (request, reply) => {
    const dispatch = await runDispatch(
      request.params.market,
      request.query.threshold,
      request.query.limit,
      request.query.force
    );

    if (!dispatch.valid) {
      return reply.code(400).send(dispatch.result);
    }

    return dispatch.result;
  });
}
