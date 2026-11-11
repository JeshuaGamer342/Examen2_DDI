import { API_BASE_URL } from "../config";
import {
  AlertsResponse,
  MarketResponse,
  MarketType,
  PushRegisterResponse,
  SummaryResponse
} from "../types";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const fetchGlobalMarket = async () => request<MarketResponse>("/v1/markets/global");

export const fetchMexicoMarket = async () => request<MarketResponse>("/v1/markets/mx");

export const fetchSummary = async () => request<SummaryResponse>("/v1/markets/summary");

export const fetchMarketAlerts = async (
  market: MarketType,
  threshold: number,
  limit = 3
): Promise<AlertsResponse> => {
  const params = new URLSearchParams({
    threshold: threshold.toString(),
    limit: limit.toString()
  });

  return request<AlertsResponse>(`/v1/alerts/market/${market}?${params.toString()}`);
};

export const registerPushSubscription = async (
  token: string,
  markets: MarketType[]
): Promise<PushRegisterResponse> => {
  return request<PushRegisterResponse>("/v1/push/register", {
    method: "POST",
    body: JSON.stringify({ token, markets })
  });
};
