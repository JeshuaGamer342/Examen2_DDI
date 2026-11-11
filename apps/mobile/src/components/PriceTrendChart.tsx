import { StyleSheet, Text, View } from "react-native";
import { InstrumentQuote } from "../types";

export interface PricePoint {
  price: number;
  updatedAt: string;
}

interface PriceTrendChartProps {
  item: InstrumentQuote;
  history: PricePoint[];
}

const formatPrice = (value: number): string => `$${value.toFixed(2)}`;

const formatPercent = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

export function PriceTrendChart({ item, history }: PriceTrendChartProps) {
  const points = history.length > 0 ? history : [{ price: item.price, updatedAt: item.updatedAt }];
  const prices = points.map((point) => point.price);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const growth = first === 0 ? 0 : ((last - first) / first) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tendencia {item.symbol}</Text>
        <Text style={[styles.growth, growth >= 0 ? styles.up : styles.down]}>{formatPercent(growth)}</Text>
      </View>

      <View style={styles.chartRow}>
        {prices.map((price, index) => {
          const normalized = range === 0 ? 0.5 : (price - min) / range;
          const height = 16 + normalized * 64;
          const isLast = index === prices.length - 1;

          return (
            <View key={`${points[index].updatedAt}-${index}`} style={styles.barSlot}>
              <View style={[styles.bar, isLast ? styles.barActive : styles.barMuted, { height }]} />
            </View>
          );
        })}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.meta}>Inicio: {formatPrice(first)}</Text>
        <Text style={styles.meta}>Actual: {formatPrice(last)}</Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.meta}>Min: {formatPrice(min)}</Text>
        <Text style={styles.meta}>Max: {formatPrice(max)}</Text>
      </View>

      {points.length < 3 ? <Text style={styles.hint}>Toca “Actualizar” para acumular más puntos.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  title: {
    color: "#f0f6fc",
    fontWeight: "700"
  },
  growth: {
    fontWeight: "800"
  },
  chartRow: {
    height: 82,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 10
  },
  barSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  bar: {
    width: "100%",
    borderRadius: 4
  },
  barActive: {
    backgroundColor: "#58a6ff"
  },
  barMuted: {
    backgroundColor: "#30363d"
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  meta: {
    color: "#8b949e",
    fontSize: 12
  },
  hint: {
    color: "#8b949e",
    fontSize: 11,
    marginTop: 6
  },
  up: {
    color: "#3fb950"
  },
  down: {
    color: "#f85149"
  }
});