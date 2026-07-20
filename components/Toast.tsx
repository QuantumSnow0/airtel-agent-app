import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

export type ToastType = "info" | "success" | "error";

type ToastProps = {
  message: string;
  title?: string;
  visible: boolean;
  onHide?: () => void;
  type?: ToastType;
  duration?: number;
};

const THEME: Record<
  ToastType,
  {
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor: string;
    iconBg: string;
    accent: string;
  }
> = {
  success: {
    icon: "check-circle",
    iconColor: "#15803D",
    iconBg: "#DCFCE7",
    accent: "#22C55E",
  },
  error: {
    icon: "error-outline",
    iconColor: "#B91C1C",
    iconBg: "#FEE2E2",
    accent: "#EF4444",
  },
  info: {
    icon: "info-outline",
    iconColor: "#1D4ED8",
    iconBg: "#DBEAFE",
    accent: "#3B82F6",
  },
};

export function Toast({
  message,
  title,
  visible,
  onHide,
  type = "info",
  duration = 3000,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shownRef = useRef(false);

  const hide = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      shownRef.current = false;
      onHide?.();
    });
  };

  useEffect(() => {
    if (visible) {
      shownRef.current = true;
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(hide, duration);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (shownRef.current) hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration, message, title, type]);

  if (!visible && !shownRef.current) return null;

  const theme = THEME[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + scaleHeight(8),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.toast}>
        <View style={[styles.accent, { backgroundColor: theme.accent }]} />
        <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
          <MaterialIcons
            name={theme.icon}
            size={scaleWidth(20)}
            color={theme.iconColor}
          />
        </View>
        <View style={styles.copy}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={[styles.message, !title && styles.messageSolo]}>
            {message}
          </Text>
        </View>
        {duration === 0 ? (
          <TouchableOpacity
            onPress={hide}
            style={styles.closeButton}
            hitSlop={10}
            accessibilityLabel="Dismiss"
          >
            <MaterialIcons name="close" size={scaleWidth(18)} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    paddingHorizontal: scaleWidth(16),
  },
  toast: {
    width: "100%",
    maxWidth: Dimensions.get("window").width - scaleWidth(32),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    paddingVertical: scaleHeight(12),
    paddingRight: scaleWidth(12),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    width: scaleWidth(4),
    alignSelf: "stretch",
    marginRight: scaleWidth(12),
    borderTopRightRadius: scaleWidth(2),
    borderBottomRightRadius: scaleWidth(2),
  },
  iconWrap: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleWidth(10),
  },
  copy: {
    flex: 1,
    paddingRight: scaleWidth(4),
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: "#0F172A",
    marginBottom: scaleHeight(2),
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: "#64748B",
    lineHeight: scaleFont(17),
  },
  messageSolo: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(13),
    color: "#334155",
  },
  closeButton: {
    padding: scaleWidth(4),
    marginLeft: scaleWidth(4),
  },
});
