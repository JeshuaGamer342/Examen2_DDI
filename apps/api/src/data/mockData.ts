import { InstrumentQuote } from "../types";

const now = () => new Date().toISOString();

export const globalMarketData = (): InstrumentQuote[] => [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    market: "global",
    price: 213.45,
    changePercent: 1.03,
    updatedAt: now()
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    market: "global",
    price: 487.24,
    changePercent: -0.31,
    updatedAt: now()
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    market: "global",
    price: 167.88,
    changePercent: 2.21,
    updatedAt: now()
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    market: "global",
    price: 245.17,
    changePercent: 0.58,
    updatedAt: now()
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    market: "global",
    price: 291.03,
    changePercent: -1.72,
    updatedAt: now()
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    market: "global",
    price: 287.38,
    changePercent: -0.27,
    updatedAt: now()
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    market: "global",
    price: 641.39,
    changePercent: 0,
    updatedAt: now()
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices Inc.",
    market: "global",
    price: 515.21,
    changePercent: 1.3,
    updatedAt: now()
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    market: "global",
    price: 342.07,
    changePercent: 0,
    updatedAt: now()
  },
  {
    symbol: "WMT",
    name: "Walmart Inc.",
    market: "global",
    price: 125.55,
    changePercent: -0.09,
    updatedAt: now()
  },
  {
    symbol: "COST",
    name: "Costco Wholesale Corp.",
    market: "global",
    price: 1066.14,
    changePercent: 0,
    updatedAt: now()
  },
  {
    symbol: "DIS",
    name: "The Walt Disney Co.",
    market: "global",
    price: 119.21,
    changePercent: 0.08,
    updatedAt: now()
  }
];

export const mexicoMarketData = (): InstrumentQuote[] => [
  {
    symbol: "WALMEX*",
    name: "Walmart de México",
    market: "mx",
    price: 62.15,
    changePercent: 0.41,
    updatedAt: now()
  },
  {
    symbol: "AMXL",
    name: "América Móvil",
    market: "mx",
    price: 16.77,
    changePercent: -0.22,
    updatedAt: now()
  },
  {
    symbol: "FEMSAUBD",
    name: "FEMSA",
    market: "mx",
    price: 186.2,
    changePercent: 1.29,
    updatedAt: now()
  },
  {
    symbol: "CEMEXCPO",
    name: "Cemex",
    market: "mx",
    price: 14.04,
    changePercent: -0.67,
    updatedAt: now()
  },
  {
    symbol: "GFNORTEO",
    name: "Grupo Financiero Banorte",
    market: "mx",
    price: 196.44,
    changePercent: 0.94,
    updatedAt: now()
  }
];
