import { MarketType } from "../types";

const expoTokenPattern = /^ExponentPushToken\[[^\]]+\]$/;

interface SubscriptionRecord {
  token: string;
  markets: Set<MarketType>;
  updatedAt: string;
}

const subscriptions = new Map<string, SubscriptionRecord>();

const dedupeMarkets = (markets: MarketType[]): MarketType[] => {
  return [...new Set(markets)];
};

export const isValidExpoPushToken = (token: string): boolean => {
  return expoTokenPattern.test(token.trim());
};

export const registerSubscription = (token: string, markets: MarketType[]): SubscriptionRecord => {
  const normalizedToken = token.trim();
  const normalizedMarkets = dedupeMarkets(markets);

  const record: SubscriptionRecord = {
    token: normalizedToken,
    markets: new Set(normalizedMarkets),
    updatedAt: new Date().toISOString()
  };

  subscriptions.set(normalizedToken, record);

  return record;
};

export const unregisterSubscription = (token: string): boolean => {
  const normalizedToken = token.trim();
  return subscriptions.delete(normalizedToken);
};

export const getSubscribersForMarket = (market: MarketType): string[] => {
  return [...subscriptions.values()]
    .filter((record) => record.markets.has(market))
    .map((record) => record.token);
};

export const getSubscriptionStats = () => {
  const values = [...subscriptions.values()];

  return {
    totalTokens: values.length,
    byMarket: {
      mx: values.filter((record) => record.markets.has("mx")).length,
      global: values.filter((record) => record.markets.has("global")).length
    },
    tokens: values.map((record) => ({
      token: record.token,
      markets: [...record.markets],
      updatedAt: record.updatedAt
    }))
  };
};
