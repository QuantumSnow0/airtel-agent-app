import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { scaleFont, scaleHeight, scaleWidth } from "../lib/utils/responsive";

export type CommissionSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type CommissionDonutCardProps = {
  totalEarningsKsh: number;
  paidKsh: number;
  segments: CommissionSegment[];
};

const CHART_SIZE = scaleWidth(200);
const STROKE = scaleWidth(24);
/** Inner hole of the donut — legend sits here only */
const CENTER_SIZE = CHART_SIZE - STROKE * 2;
/** Gap between slices (degrees) */
const GAP_DEGREES = 10;

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/** Filled ring slice — outer edge follows the circle (no outward round caps) */
function annularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
) {
  if (endDeg <= startDeg) return "";
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const oStart = pointOnCircle(cx, cy, rOuter, startDeg);
  const oEnd = pointOnCircle(cx, cy, rOuter, endDeg);
  const iEnd = pointOnCircle(cx, cy, rInner, endDeg);
  const iStart = pointOnCircle(cx, cy, rInner, startDeg);

  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${iStart.x} ${iStart.y}`,
    "Z",
  ].join(" ");
}

function DonutRing({
  segments,
  size,
  strokeWidth,
}: {
  segments: CommissionSegment[];
  size: number;
  strokeWidth: number;
}) {
  const ring = useMemo(() => {
    const center = size / 2;
    const rMid = (size - strokeWidth) / 2;
    const rInner = rMid - strokeWidth / 2;
    const rOuter = rMid + strokeWidth / 2;
    const ordered = segments.filter((s) => s.value > 0);
    const total = ordered.reduce((sum, s) => sum + s.value, 0);

    if (total <= 0 || ordered.length === 0) {
      return {
        center,
        rInner,
        rOuter,
        slices: [] as const,
        trackPath: annularSectorPath(center, center, rInner, rOuter, 0, 359.99),
        empty: true,
      };
    }

    const gapDeg = ordered.length > 1 ? GAP_DEGREES : 0;
    const usableDeg = 360 - ordered.length * gapDeg;
    let cursorDeg = 0;

    const slices = ordered.map((segment) => {
      const sweepDeg = (segment.value / total) * usableDeg;
      const startDeg = cursorDeg;
      const endDeg = cursorDeg + sweepDeg;
      cursorDeg = endDeg + gapDeg;

      return {
        key: segment.key,
        color: segment.color,
        d: annularSectorPath(center, center, rInner, rOuter, startDeg, endDeg),
      };
    });

    return {
      center,
      rInner,
      rOuter,
      slices,
      trackPath: annularSectorPath(center, center, rInner, rOuter, 0, 359.99),
      empty: false,
    };
  }, [segments, size, strokeWidth]);

  const { slices, trackPath, empty } = ring;

  return (
    <Svg width={size} height={size}>
      <Path d={trackPath} fill="#E8ECF0" />
      {!empty &&
        slices.map((slice) => (
          <Path key={slice.key} d={slice.d} fill={slice.color} />
        ))}
    </Svg>
  );
}

export function CommissionDonutCard({
  totalEarningsKsh,
  paidKsh,
  segments,
}: CommissionDonutCardProps) {
  const legendSegments = segments;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartWrap}>
        <DonutRing segments={segments} size={CHART_SIZE} strokeWidth={STROKE} />
        <View style={styles.centerLegend} pointerEvents="none">
          {legendSegments.map((item) => {
            const pct =
              totalEarningsKsh > 0
                ? Math.round((item.value / totalEarningsKsh) * 100)
                : 0;
            return (
              <View key={item.key} style={styles.centerLegendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.centerLegendLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.centerLegendPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total earnings</Text>
          <Text style={styles.summaryAmount}>
            KSh {totalEarningsKsh.toLocaleString("en-KE")}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Paid to you</Text>
          <Text style={[styles.summaryAmount, styles.summaryAmountPaid]}>
            KSh {paidKsh.toLocaleString("en-KE")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: scaleHeight(16),
    paddingHorizontal: scaleWidth(4),
  },
  chartWrap: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLegend: {
    position: "absolute",
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    top: (CHART_SIZE - CENTER_SIZE) / 2,
    left: (CHART_SIZE - CENTER_SIZE) / 2,
    alignItems: "center",
    justifyContent: "center",
    gap: scaleHeight(6),
  },
  centerLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(5),
    maxWidth: "100%",
  },
  centerLegendLabel: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_600SemiBold",
    color: "#333333",
    flexShrink: 1,
  },
  centerLegendPct: {
    fontSize: scaleFont(11),
    fontFamily: "Poppins_600SemiBold",
    color: "#666666",
  },
  legendDot: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: scaleWidth(5),
  },
  summary: {
    marginTop: scaleHeight(16),
    paddingTop: scaleHeight(16),
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
    gap: scaleHeight(12),
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_500Medium",
    color: "#666666",
  },
  summaryAmount: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_700Bold",
    color: "#1A1A1A",
  },
  summaryAmountPaid: {
    color: "#15803D",
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E8ECF0",
  },
});
