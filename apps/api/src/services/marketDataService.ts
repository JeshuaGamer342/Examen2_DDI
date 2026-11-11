import { globalMarketData, mexicoMarketData } from "../data/mockData";
import { config } from "../config";
import { InstrumentQuote, MarketType } from "../types";

export type MarketDataSource = "finnhub" | "mock";

export interface MarketDataResult {
  source: MarketDataSource;
  data: InstrumentQuote[];
  warning?: string;
}

interface MarketCacheEntry {
  expiresAt: number;
  result: MarketDataResult;
}

interface FinnhubQuoteResponse {
  c?: number;
  dp?: number;
}

const symbolMap: Record<string, string> = {
  AAPL: "AAPL",
  MSFT: "MSFT",
  NVDA: "NVDA",
  AMZN: "AMZN",
  TSLA: "TSLA",
  GOOGL: "GOOGL",
  META: "META",
  AMD: "AMD",
  JPM: "JPM",
  WMT: "WMT",
  COST: "COST",
  DIS: "DIS",
  "WALMEX*": "BMV:WALMEX*",
  AMXL: "BMV:AMXL",
  FEMSAUBD: "BMV:FEMSAUBD",
  CEMEXCPO: "BMV:CEMEXCPO",
  GFNORTEO: "BMV:GFNORTEO"
};

const marketCache = new Map<MarketType, MarketCacheEntry>();
const inFlightByMarket = new Map<MarketType, Promise<MarketDataResult>>();

const cloneMarketData = (result: MarketDataResult): MarketDataResult => {
  return {
    source: result.source,
    warning: result.warning,
    data: result.data.map((item) => ({
      ...item
    }))
  };
};

const getFallbackForMarket = (market: MarketType): InstrumentQuote[] =>
  market === "mx" ? mexicoMarketData() : globalMarketData();

const getApiSymbol = (symbol: string): string => symbolMap[symbol] ?? symbol;

const fetchQuote = async (symbol: string, apiKey: string): Promise<FinnhubQuoteResponse> => {
  const params = new URLSearchParams({
    symbol: getApiSymbol(symbol),
    token: apiKey
  });

  const response = await fetch(`https://finnhub.io/api/v1/quote?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Finnhub request failed for ${symbol}: ${response.status}`);
  }

  return (await response.json()) as FinnhubQuoteResponse;
};

const isValidQuote = (quote: FinnhubQuoteResponse): quote is Required<Pick<FinnhubQuoteResponse, "c" | "dp">> => {
  return Number.isFinite(quote.c) && Number.isFinite(quote.dp);
};

const mapWithLiveQuote = (
  fallback: InstrumentQuote,
  quote: Required<Pick<FinnhubQuoteResponse, "c" | "dp">>,
  updatedAt: string
): InstrumentQuote => {
  return {
    ...fallback,
    price: Number(quote.c.toFixed(2)),
    changePercent: Number(quote.dp.toFixed(2)),
    updatedAt
  };
};

const fetchFreshMarketData = async (market: MarketType): Promise<MarketDataResult> => {
  const fallbackData = getFallbackForMarket(market);

  if (!config.finnhubApiKey) {
    return {
      source: "mock",
      data: fallbackData,
      warning: "FINNHUB_API_KEY no está configurada. Usando datos mock."
    };
  }

  const updatedAt = new Date().toISOString();

  const results = await Promise.allSettled(
    fallbackData.map(async (item) => {
      const quote = await fetchQuote(item.symbol, config.finnhubApiKey);

      if (!isValidQuote(quote)) {
        throw new Error(`Finnhub devolvió datos incompletos para ${item.symbol}.`);
      }

      return mapWithLiveQuote(item, quote, updatedAt);
    })
  );

  const merged = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      ...fallbackData[index],
      updatedAt
    };
  });

  const failures = results.filter((result) => result.status === "rejected").length;

  if (failures === merged.length) {
    return {
      source: "mock",
      data: fallbackData,
      warning: "Finnhub no respondió correctamente. Usando datos mock."
    };
  }

  if (failures > 0) {
    return {
      source: "finnhub",
      data: merged,
      warning: `Finnhub tuvo ${failures} símbolo(s) con fallback a mock.`
    };
  }

  return {
    source: "finnhub",
    data: merged
  };
};

export const getMarketData = async (market: MarketType): Promise<MarketDataResult> => {
  const now = Date.now();
  const cached = marketCache.get(market);

  if (cached && cached.expiresAt > now) {
    return cloneMarketData(cached.result);
  }

  const inFlight = inFlightByMarket.get(market);

  if (inFlight) {
    return cloneMarketData(await inFlight);
  }

  const request = fetchFreshMarketData(market)
    .then((result) => {
      const cacheTtlMs = result.source === "finnhub" ? config.marketCacheTtlMs : Math.min(config.marketCacheTtlMs, 5_000);

      marketCache.set(market, {
        result,
        expiresAt: Date.now() + cacheTtlMs
      });

      return result;
    })
    .finally(() => {
      inFlightByMarket.delete(market);
    });

  inFlightByMarket.set(market, request);

  return cloneMarketData(await request);
};
