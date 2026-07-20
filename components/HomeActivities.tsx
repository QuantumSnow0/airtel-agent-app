import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchHomeActivities,
  fetchLastPayment,
  type HomeActivity,
  type HomeActivityKind,
  type LastPaymentSummary,
} from "../lib/services/homeActivitiesService";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

const KIND_META: Record<
  HomeActivityKind,
  { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }
> = {
  payment: { icon: "payments", color: "#0F766E", bg: "#CCFBF1" },
  registration: { icon: "person-add", color: "#1D4ED8", bg: "#DBEAFE" },
  installation: { icon: "home-repair-service", color: "#B45309", bg: "#FEF3C7" },
  lead_accepted: { icon: "campaign", color: "#C2410C", bg: "#FFEDD5" },
  lead_kyc: { icon: "verified-user", color: "#0369A1", bg: "#E0F2FE" },
  lead_install: { icon: "check-circle", color: "#15803D", bg: "#DCFCE7" },
};

type ActivityFilter = "all" | "payments" | "leads" | "onboards" | "installs";

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "payments", label: "Payments" },
  { id: "leads", label: "Leads" },
  { id: "onboards", label: "Onboards" },
  { id: "installs", label: "Installs" },
];

function matchesFilter(kind: HomeActivityKind, filter: ActivityFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "payments":
      return kind === "payment";
    case "leads":
      return (
        kind === "lead_accepted" ||
        kind === "lead_kyc" ||
        kind === "lead_install"
      );
    case "onboards":
      return kind === "registration";
    case "installs":
      return kind === "installation" || kind === "lead_install";
    default:
      return true;
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lastPaidLabel(payment: LastPaymentSummary): string | null {
  if (!payment) return null;
  const d = new Date(payment.at);
  const datePart = d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
  return `Last paid KSh ${payment.amountKsh.toLocaleString()} · ${datePart}`;
}

function groupByDay(items: HomeActivity[]) {
  const map = new Map<string, HomeActivity[]>();
  for (const item of items) {
    const key = dayLabel(item.at);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()];
}

function ActivityRow({
  row,
  index,
}: {
  row: HomeActivity;
  index: number;
}) {
  const router = useRouter();
  const meta = KIND_META[row.kind];
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: Math.min(index, 8) * 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay: Math.min(index, 8) * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY, row.id]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => {
          if (row.href) router.push(row.href as any);
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <MaterialIcons
            name={meta.icon}
            size={scaleWidth(18)}
            color={meta.color}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {row.subtitle}
          </Text>
        </View>
        <Text style={styles.time}>{timeLabel(row.at)}</Text>
      </Pressable>
    </Animated.View>
  );
}

type HomeActivitiesProps = {
  agentId: string | null | undefined;
  estimatedKsh: number;
  paidKsh: number;
  refreshKey?: number;
  /** For empty-state CTAs */
  canReceiveLeads?: boolean;
  leadsAvailable?: boolean;
  onEnableLeads?: () => void;
};

export function HomeActivities({
  agentId,
  estimatedKsh,
  paidKsh,
  refreshKey = 0,
  canReceiveLeads = false,
  leadsAvailable = false,
  onEnableLeads,
}: HomeActivitiesProps) {
  const router = useRouter();
  const [items, setItems] = useState<HomeActivity[]>([]);
  const [lastPayment, setLastPayment] = useState<LastPaymentSummary>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const load = useCallback(async () => {
    if (!agentId) {
      setItems([]);
      setLastPayment(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [next, payment] = await Promise.all([
        fetchHomeActivities(agentId),
        fetchLastPayment(agentId),
      ]);
      setItems(next);
      setLastPayment(payment);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item.kind, filter)),
    [items, filter],
  );
  const groups = groupByDay(filtered);
  const paidLine = lastPaidLabel(lastPayment);
  let rowIndex = 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.walletStrip}
        onPress={() => router.push("/earnings-history" as any)}
      >
        <View style={styles.walletCol}>
          <Text style={styles.walletLabel}>Estimated</Text>
          <Text style={styles.walletValue}>
            KSh {estimatedKsh.toLocaleString()}
          </Text>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletCol}>
          <Text style={styles.walletLabel}>Paid</Text>
          <Text style={styles.walletValue}>
            KSh {paidKsh.toLocaleString()}
          </Text>
          {paidLine ? (
            <Text style={styles.walletHint} numberOfLines={1}>
              {paidLine}
            </Text>
          ) : null}
        </View>
        <MaterialIcons name="chevron-right" size={scaleWidth(22)} color="#94A3B8" />
      </Pressable>

      <View style={styles.headerRow}>
        <Text style={styles.title}>Activities</Text>
        <Pressable onPress={() => router.navigate("/registrations" as any)}>
          <Text style={styles.link}>Records</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonCopy}>
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLineNarrow} />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Get started</Text>
          <Text style={styles.emptyText}>
            Turn on leads and onboard your first customer — activity will show
            up here.
          </Text>
          <View style={styles.emptyActions}>
            {canReceiveLeads && !leadsAvailable && onEnableLeads ? (
              <Pressable
                style={styles.emptyBtnPrimary}
                onPress={onEnableLeads}
              >
                <Text style={styles.emptyBtnPrimaryText}>
                  Start receiving leads
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.emptyBtnSecondary}
              onPress={() => router.push("/register-safaricom-customer" as any)}
            >
              <Text style={styles.emptyBtnSecondaryText}>
                Onboard first customer
              </Text>
            </Pressable>
          </View>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing in this filter</Text>
          <Text style={styles.emptyText}>
            Try All, or another category above.
          </Text>
        </View>
      ) : (
        groups.map(([day, rows]) => (
          <View key={day} style={styles.group}>
            <Text style={styles.day}>{day}</Text>
            {rows.map((row) => {
              const idx = rowIndex++;
              return <ActivityRow key={row.id} row={row} index={idx} />;
            })}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: scaleWidth(8),
    marginBottom: scaleHeight(8),
  },
  walletStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: scaleWidth(4),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(14),
    marginBottom: scaleHeight(18),
  },
  walletCol: {
    flex: 1,
  },
  walletLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(11),
    color: "rgba(255,255,255,0.55)",
    marginBottom: scaleHeight(3),
  },
  walletValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(16),
    color: "#FFFFFF",
  },
  walletHint: {
    marginTop: scaleHeight(3),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(10),
    color: "rgba(255,255,255,0.45)",
  },
  walletDivider: {
    width: 1,
    height: scaleHeight(28),
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: scaleWidth(10),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleHeight(10),
    paddingHorizontal: scaleWidth(2),
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(18),
    color: "#111827",
  },
  link: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(13),
    color: "#0066CC",
  },
  filters: {
    gap: scaleWidth(8),
    paddingBottom: scaleHeight(12),
    paddingHorizontal: scaleWidth(2),
  },
  chip: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: scaleWidth(16),
    backgroundColor: "#F1F5F9",
  },
  chipActive: {
    backgroundColor: "#0F172A",
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(12),
    color: "#64748B",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  skeletonList: {
    paddingTop: scaleHeight(4),
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleHeight(10),
  },
  skeletonIcon: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    backgroundColor: "#E2E8F0",
    marginRight: scaleWidth(12),
  },
  skeletonCopy: {
    flex: 1,
    gap: scaleHeight(6),
  },
  skeletonLineWide: {
    height: scaleHeight(12),
    width: "70%",
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  skeletonLineNarrow: {
    height: scaleHeight(10),
    width: "45%",
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
  },
  empty: {
    paddingVertical: scaleHeight(24),
    paddingHorizontal: scaleWidth(8),
  },
  emptyTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
    color: "#334155",
    marginBottom: scaleHeight(4),
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(13),
    color: "#64748B",
    lineHeight: scaleFont(19),
  },
  emptyActions: {
    marginTop: scaleHeight(14),
    gap: scaleHeight(8),
  },
  emptyBtnPrimary: {
    backgroundColor: "#0066CC",
    paddingVertical: scaleHeight(11),
    borderRadius: scaleWidth(10),
    alignItems: "center",
  },
  emptyBtnPrimaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(13),
    color: "#FFFFFF",
  },
  emptyBtnSecondary: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: scaleHeight(11),
    borderRadius: scaleWidth(10),
    alignItems: "center",
  },
  emptyBtnSecondaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(13),
    color: "#0F172A",
  },
  group: {
    marginBottom: scaleHeight(14),
  },
  day: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(11),
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: scaleHeight(8),
    paddingHorizontal: scaleWidth(2),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleHeight(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleWidth(12),
  },
  copy: {
    flex: 1,
    paddingRight: scaleWidth(8),
  },
  rowTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: "#0F172A",
  },
  rowSub: {
    marginTop: scaleHeight(2),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: "#64748B",
  },
  time: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(11),
    color: "#94A3B8",
  },
});
