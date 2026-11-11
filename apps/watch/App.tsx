import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  fetchGlobalMarket,
  fetchMarketAlerts
} from "./src/api/marketsApi";
import { ALERT_THRESHOLD, ENABLE_REMOTE_PUSH } from "./src/config";
import { registerRemotePush } from "./src/notifications/marketAlerts";
import { InstrumentQuote, MarketDataSource } from "./src/types";

const ALERT_LIMIT = 3;
const REFRESH_INTERVAL_MS = 60_000;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InstrumentQuote[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [pushStatus, setPushStatus] = useState<"idle" | "on" | "off">("idle");
  const [error, setError] = useState<string | null>(null);
  const [marketSource, setMarketSource] = useState<MarketDataSource | null>(null);
  const [marketWarning, setMarketWarning] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

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

    if (showLoader) {
      setLoading(true);
    }

    try {
      isFetchingRef.current = true;
      setError(null);

      const [marketData, alertsData] = await Promise.all([
        fetchGlobalMarket(),
        fetchMarketAlerts("global", ALERT_THRESHOLD, ALERT_LIMIT)
      ]);

      setItems(marketData.data);
      setMarketSource(marketData.source);
      setMarketWarning(marketData.warning ?? null);
      setAlertCount(alertsData.count);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Bolsa Pulse · Global USD</Text>

        {loading ? <ActivityIndicator color="#58a6ff" /> : null}

        {items.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>GL ↑ {marketSummary.gainers} ↓ {marketSummary.losers}</Text>
          </View>
        ) : null}

        <Text style={styles.alertText}>
          Alertas ±{ALERT_THRESHOLD.toFixed(2)}%: {alertCount}
        </Text>
        <Text style={styles.pushText}>
          Push: {pushStatus === "on" ? "Activa" : pushStatus === "off" ? "Inactiva" : "Init"}
        </Text>
        {marketSource ? (
          <Text style={styles.sourceText}>Fuente: {marketSource === "finnhub" ? "Finnhub" : "Mock"}</Text>
        ) : null}
        {marketWarning ? <Text style={styles.warningText}>Aviso: {marketWarning}</Text> : null}
        <Text style={styles.refreshTextSecondary}>Auto: 1 min</Text>

        {error ? <Text style={styles.errorText}>Error: {error}</Text> : null}

        {!loading &&
          !error &&
          items.map((item) => {
            const up = item.changePercent >= 0;

            return (
              <View key={item.symbol} style={styles.quoteRow}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.price}>USD ${item.price.toFixed(2)}</Text>
                <Text style={[styles.change, up ? styles.up : styles.down]}>
                  {up ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </Text>
              </View>
            );
          })}

        <Pressable style={styles.refreshButton} onPress={() => void loadData(true)}>
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </ScrollView>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117"
  },
  scroll: {
    padding: 10,
    paddingBottom: 20
  },
  title: {
    color: "#f0f6fc",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center"
  },
  summaryCard: {
    backgroundColor: "#161b22",
    borderColor: "#30363d",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8
  },
  summaryText: {
    color: "#c9d1d9",
    fontSize: 11
  },
  alertText: {
    color: "#58a6ff",
    fontSize: 11,
    marginBottom: 2,
    fontWeight: "700"
  },
  pushText: {
    color: "#8b949e",
    fontSize: 10,
    marginBottom: 2
  },
  sourceText: {
    color: "#8b949e",
    fontSize: 10,
    marginBottom: 2
  },
  warningText: {
    color: "#f7b955",
    fontSize: 10,
    marginBottom: 2
  },
  refreshTextSecondary: {
    color: "#8b949e",
    fontSize: 10,
    marginBottom: 6
  },
  errorText: {
    color: "#f85149",
    fontSize: 11,
    marginBottom: 6
  },
  quoteRow: {
    backgroundColor: "#161b22",
    borderColor: "#30363d",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6
  },
  symbol: {
    color: "#f0f6fc",
    fontWeight: "800",
    fontSize: 12
  },
  price: {
    color: "#f0f6fc",
    marginTop: 2,
    fontSize: 11
  },
  change: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700"
  },
  up: {
    color: "#3fb950"
  },
  down: {
    color: "#f85149"
  },
  refreshButton: {
    marginTop: 6,
    backgroundColor: "#238636",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center"
  },
  refreshText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
  }
});
