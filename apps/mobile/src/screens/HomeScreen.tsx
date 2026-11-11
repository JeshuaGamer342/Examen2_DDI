import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchGlobalMarket, fetchMarketAlerts } from "../api/marketsApi";
import { ALERT_THRESHOLD, ENABLE_REMOTE_PUSH } from "../config";
import { MarketCard } from "../components/MarketCard";
import { registerRemotePush } from "../notifications/marketAlerts";
import { InstrumentQuote, MarketDataSource, PricePoint } from "../types";

const ALERT_LIMIT = 5;
const MAX_HISTORY_POINTS = 20;
const ONE_HOUR_MS = 3_600_000;
const REFRESH_INTERVAL_MS = 60_000;

const estimatePreviousPrice = (price: number, changePercent: number): number | null => {
  const factor = 1 + changePercent / 100;

  if (!Number.isFinite(factor) || factor <= 0) {
    return null;
  }

  const previous = price / factor;

  if (!Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  return previous;
};

const buildSeedHistory = (item: InstrumentQuote): PricePoint[] => {
  const previous = estimatePreviousPrice(item.price, item.changePercent);

  if (previous === null) {
    return [{ price: item.price, updatedAt: item.updatedAt }];
  }

  const itemTimestamp = new Date(item.updatedAt).getTime();
  const previousTimestamp = Number.isFinite(itemTimestamp)
    ? Math.max(itemTimestamp - ONE_HOUR_MS, Date.now() - ONE_HOUR_MS)
    : Date.now() - ONE_HOUR_MS;

  return [
    {
      price: Number(previous.toFixed(2)),
      updatedAt: new Date(previousTimestamp).toISOString()
    },
    {
      price: item.price,
      updatedAt: item.updatedAt
    }
  ];
};

const appendHistoryPoint = (previousHistory: PricePoint[] | undefined, item: InstrumentQuote): PricePoint[] => {
  const currentPoint: PricePoint = {
    price: item.price,
    updatedAt: item.updatedAt
  };

  if (!previousHistory || previousHistory.length === 0) {
    return buildSeedHistory(item);
  }

  const lastPoint = previousHistory[previousHistory.length - 1];

  if (lastPoint.updatedAt === currentPoint.updatedAt && lastPoint.price === currentPoint.price) {
    return previousHistory;
  }

  const nextHistory = [...previousHistory, currentPoint];
  return nextHistory.slice(-MAX_HISTORY_POINTS);
};

export function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InstrumentQuote[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [pushStatus, setPushStatus] = useState<"idle" | "on" | "off">("idle");
  const [error, setError] = useState<string | null>(null);
  const [marketSource, setMarketSource] = useState<MarketDataSource | null>(null);
  const [marketWarning, setMarketWarning] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [priceHistoryBySymbol, setPriceHistoryBySymbol] = useState<Record<string, PricePoint[]>>({});
  const isFetchingRef = useRef(false);

  const title = "Mercado Global (USD)";

  const selectedItem = useMemo(() => {
    if (items.length === 0) {
      return null;
    }

    if (!selectedSymbol) {
      return items[0];
    }

    return items.find((item) => item.symbol === selectedSymbol) ?? items[0];
  }, [items, selectedSymbol]);

  const marketSummary = useMemo(() => {
    const gainers = items.filter((item) => item.changePercent >= 0).length;
    return {
      gainers,
      losers: items.length - gainers
    };
  }, [items]);

  const loadData = async (showLoader = true) => {
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;

      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const [marketResult, alertsResult] = await Promise.all([
        fetchGlobalMarket(),
        fetchMarketAlerts("global", ALERT_THRESHOLD, ALERT_LIMIT)
      ]);

      setItems(marketResult.data);
      setMarketSource(marketResult.source);
      setMarketWarning(marketResult.warning ?? null);
      setAlertCount(alertsResult.count);

      setPriceHistoryBySymbol((previous) => {
        const next = { ...previous };

        marketResult.data.forEach((item) => {
          next[item.symbol] = appendHistoryPoint(previous[item.symbol], item);
        });

        return next;
      });
    } catch (loadError) {
      setAlertCount(0);
      setMarketSource(null);
      setMarketWarning(null);
      setError(loadError instanceof Error ? loadError.message : "Error desconocido");
    } finally {
      isFetchingRef.current = false;

      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const bootstrapPush = async () => {
      if (!ENABLE_REMOTE_PUSH) {
        setPushStatus("off");
        return;
      }

      try {
        const registered = await registerRemotePush(["global"]);
        setPushStatus(registered ? "on" : "off");
      } catch {
        setPushStatus("off");
      }
    };

    void bootstrapPush();
  }, []);

  useEffect(() => {
    void loadData(true);

    const intervalId = setInterval(() => {
      void loadData(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedSymbol(null);
      return;
    }

    if (!selectedSymbol || !items.some((item) => item.symbol === selectedSymbol)) {
      setSelectedSymbol(items[0].symbol);
    }
  }, [items, selectedSymbol]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bolsa Pulse</Text>
      <Text style={styles.subtitle}>Monitoreo movil del mercado global en dolares estadounidenses</Text>

      {items.length > 0 ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen rapido</Text>
          <Text style={styles.summaryText}>
            Global: {marketSummary.gainers} al alza / {marketSummary.losers} a la baja
          </Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable style={styles.refreshButton} onPress={() => void loadData(true)}>
          <Text style={styles.refreshButtonText}>Actualizar</Text>
        </Pressable>
      </View>

      <Text style={styles.alertText}>Alertas +/- {ALERT_THRESHOLD.toFixed(2)}%: {alertCount}</Text>
      <Text style={styles.pushText}>
        Push remota: {pushStatus === "on" ? "Activa" : pushStatus === "off" ? "Inactiva" : "Inicializando"}
      </Text>
      {marketSource ? (
        <Text style={styles.sourceText}>
          Fuente: {marketSource === "finnhub" ? "Finnhub (tiempo real)" : "Mock"}
        </Text>
      ) : null}
      {marketWarning ? <Text style={styles.warningText}>Aviso: {marketWarning}</Text> : null}
      <Text style={styles.autoRefreshText}>Actualizacion automatica: cada 1 minuto</Text>

      {loading ? <ActivityIndicator color="#58a6ff" /> : null}
      {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}

      {!loading &&
        !error &&
        items.map((item) => (
          <MarketCard
            key={item.symbol}
            item={item}
            history={priceHistoryBySymbol[item.symbol] ?? []}
            selected={item.symbol === selectedItem?.symbol}
            onPress={() => setSelectedSymbol(item.symbol)}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 28
  },
  title: {
    color: "#f0f6fc",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#8b949e",
    marginTop: 4,
    marginBottom: 14
  },
  summaryCard: {
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  summaryTitle: {
    color: "#f0f6fc",
    fontWeight: "700",
    marginBottom: 6
  },
  summaryText: {
    color: "#c9d1d9"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: {
    color: "#f0f6fc",
    fontWeight: "700",
    fontSize: 18
  },
  refreshButton: {
    backgroundColor: "#238636",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  refreshButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  alertText: {
    color: "#58a6ff",
    marginBottom: 4,
    fontWeight: "600"
  },
  pushText: {
    color: "#8b949e",
    marginBottom: 4,
    fontSize: 12
  },
  sourceText: {
    color: "#8b949e",
    marginBottom: 4,
    fontSize: 12
  },
  warningText: {
    color: "#f7b955",
    marginBottom: 4,
    fontSize: 12
  },
  autoRefreshText: {
    color: "#8b949e",
    marginBottom: 10,
    fontSize: 12
  },
  errorText: {
    color: "#f85149",
    marginTop: 8
  }
});
