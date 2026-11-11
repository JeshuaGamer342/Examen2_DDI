export type MarketType = "global" | "mx";

export interface InstrumentQuote {
  symbol: string;
  name: string;
  market: MarketType;
  price: number;
  changePercent: number;
  updatedAt: string;
}

export interface MarketSummary {
  market: MarketType;
  instruments: number;
  gainers: number;
  losers: number;
  updatedAt: string;
}
