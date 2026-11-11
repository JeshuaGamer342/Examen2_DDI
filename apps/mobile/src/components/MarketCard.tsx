import { InstrumentQuote, PricePoint } from "../types";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface MarketCardProps {
  item: InstrumentQuote;
  history?: PricePoint[];
  selected?: boolean;
  onPress?: () => void;
}

const MAX_SPARK_POINTS = 10;

const getTrendPoints = (history: PricePoint[] | undefined, fallbackPrice: number): number[] => {
  if (!history || history.length === 0) {
    return [fallbackPrice];
  }

  return history.slice(-MAX_SPARK_POINTS).map((point) => point.price);
};

export function MarketCard({ item, history, selected = false, onPress }: MarketCardProps) {
  const isPositive = item.changePercent >= 0;
  const trendPoints = getTrendPoints(history, item.price);
  const trendMin = Math.min(...trendPoints);
  const trendMax = Math.max(...trendPoints);
  const trendRange = trendMax - trendMin;
  const trendStart = trendPoints[0];
  const trendEnd = trendPoints[trendPoints.length - 1];
  const trendPercent = trendStart === 0 ? 0 : ((trendEnd - trendStart) / trendStart) * 100;
  const trendIsUp = trendPercent >= 0;

  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.price}>USD ${item.price.toFixed(2)}</Text>
          <Text style={[styles.change, isPositive ? styles.up : styles.down]}>
            {isPositive ? "+" : ""}
            {item.changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={styles.trendRow}>
        <View style={styles.sparkline}>
          {trendPoints.map((price, index) => {
            const normalized = trendRange === 0 ? 0.5 : (price - trendMin) / trendRange;
            const height = 6 + normalized * 22;
            const isLast = index === trendPoints.length - 1;
            const segmentDown = index > 0 && price < trendPoints[index - 1];

            return (
              <View
                key={`${item.symbol}-${index}`}
                style={[
                  styles.sparkBar,
                  { height },
                  isLast
                    ? trendIsUp
                      ? styles.sparkBarUpStrong
                      : styles.sparkBarDownStrong
                    : segmentDown
                    ? styles.sparkBarDown
                    : styles.sparkBarUp
                ]}
              />
            );
          })}
        </View>

        <Text style={[styles.trendText, trendIsUp ? styles.up : styles.down]}>
          {trendIsUp ? "Alza" : "Baja"} {Math.abs(trendPercent).toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10
  },
  cardSelected: {
    borderColor: "#58a6ff",
    backgroundColor: "#1f2a38"
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  symbol: {
    color: "#f0f6fc",
    fontWeight: "700",
    fontSize: 16
  },
  name: {
    color: "#8b949e",
    marginTop: 2
  },
  right: {
    alignItems: "flex-end"
  },
  price: {
    color: "#f0f6fc",
    fontWeight: "700"
  },
  change: {
    marginTop: 4,
    fontWeight: "700"
  },
  trendRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  sparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    flex: 1,
    marginRight: 8,
    minHeight: 28
  },
  sparkBar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 6
  },
  sparkBarUp: {
    backgroundColor: "#2ea043"
  },
  sparkBarDown: {
    backgroundColor: "#f85149"
  },
  sparkBarUpStrong: {
    backgroundColor: "#3fb950"
  },
  sparkBarDownStrong: {
    backgroundColor: "#ff7b72"
  },
  trendText: {
    fontWeight: "700",
    fontSize: 12,
    minWidth: 78,
    textAlign: "right"
  },
  up: {
    color: "#3fb950"
  },
  down: {
    color: "#f85149"
  }
});
