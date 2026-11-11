export type MarketType = "global" | "mx";
export type MarketDataSource = "finnhub" | "mock";

export interface InstrumentQuote {
  symbol: string;
  name: string;
  market: MarketType;
  price: number;
  changePercent: number;
  updatedAt: string;
}

export interface MarketResponse {
  market: MarketType;
  source: MarketDataSource;
  warning?: string;
  count: number;
  data: InstrumentQuote[];
}

export interface SummaryItem {
  market: MarketType;
  instruments: number;
  gainers: number;
  losers: number;
  updatedAt: string;
}

export interface SummaryResponse {
  generatedAt: string;
  global: SummaryItem;
  mexico: SummaryItem;
  sources: {
    global: MarketDataSource;
    mexico: MarketDataSource;
  };
  warnings: string[];
}

export interface AlertsResponse {
  market: MarketType;
  source: MarketDataSource;
  warning?: string;
  threshold: number;
  count: number;
  generatedAt: string;
  data: InstrumentQuote[];
}

export interface PushRegisterResponse {
  message: string;
  token: string;
  markets: MarketType[];
  updatedAt: string;
}

export interface PricePoint {
  price: number;
  updatedAt: string;
}

