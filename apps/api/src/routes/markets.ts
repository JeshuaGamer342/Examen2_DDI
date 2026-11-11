import { FastifyInstance } from "fastify";
import {
  applyLimit,
  findMarketAlerts,
  parseThreshold
} from "../services/alertsService";
import { getMarketData } from "../services/marketDataService";
import { InstrumentQuote, MarketSummary, MarketType } from "../types";

const summarize = (market: MarketType, items: InstrumentQuote[]): MarketSummary => {
  const gainers = items.filter((item) => item.changePercent >= 0).length;
  const losers = items.length - gainers;

  return {
    market,
    instruments: items.length,
    gainers,
    losers,
    updatedAt: new Date().toISOString()
  };
};

const isMarket = (market: string): market is MarketType => market === "mx" || market === "global";

export async function marketRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { limit?: number | string } }>("/v1/markets/global", async (request) => {
    const result = await getMarketData("global");
    const data = applyLimit(result.data, request.query.limit);

    return {
      market: "global",
      source: result.source,
      warning: result.warning,
      count: data.length,
      data
    };
  });

  app.get<{ Querystring: { limit?: number | string } }>("/v1/markets/mx", async (request) => {
    const result = await getMarketData("mx");
    const data = applyLimit(result.data, request.query.limit);

    return {
      market: "mx",
      source: result.source,
      warning: result.warning,
      count: data.length,
      data
    };
  });

  app.get("/v1/markets/summary", async () => {
    const [globalResult, mexicoResult] = await Promise.all([
      getMarketData("global"),
      getMarketData("mx")
    ]);

    return {
      generatedAt: new Date().toISOString(),
      global: summarize("global", globalResult.data),
      mexico: summarize("mx", mexicoResult.data),
      sources: {
        global: globalResult.source,
        mexico: mexicoResult.source
      },
      warnings: [globalResult.warning, mexicoResult.warning].filter(Boolean)
    };
  });

  app.get<{
    Params: { market: string };
    Querystring: { threshold?: number | string; limit?: number | string };
  }>("/v1/alerts/market/:market", async (request, reply) => {
    const { market } = request.params;

    if (!isMarket(market)) {
      return reply.code(400).send({
        message: "Mercado inválido. Usa 'mx' o 'global'."
      });
    }

    const result = await getMarketData(market);
    const threshold = parseThreshold(request.query.threshold, 1);
    const data = findMarketAlerts(result.data, threshold, request.query.limit);

    return {
      market,
      source: result.source,
      warning: result.warning,
      threshold,
      count: data.length,
      generatedAt: new Date().toISOString(),
      data
    };
  });
}
