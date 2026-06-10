import { useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getDiceBearAvatarUrl,
  type DiceBearStyle,
  DICEBEAR_STYLE_DEFAULT,
} from "../lib/utils/dicebear";
import { scaleWidth } from "../lib/utils/responsive";

type AgentAvatarProps = {
  seed: string;
  size?: number;
  style?: DiceBearStyle;
  fallbackInitial?: string;
  showAccountStatusBadge?: boolean;
  isApproved?: boolean;
  statusSpin?: Animated.AnimatedInterpolation<string>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AgentAvatar({
  seed,
  size = scaleWidth(40),
  style = DICEBEAR_STYLE_DEFAULT,
  fallbackInitial = "?",
  showAccountStatusBadge = false,
  isApproved = false,
  statusSpin,
  containerStyle,
}: AgentAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const uri = getDiceBearAvatarUrl(seed, size, style);
  const badgeSize = Math.max(scaleWidth(14), size * 0.38);
  const iconSize = Math.max(scaleWidth(9), badgeSize * 0.62);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        containerStyle,
      ]}
    >
      {!imageFailed ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={200}
          onError={() => setImageFailed(true)}
          accessibilityLabel="Agent avatar"
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.fallbackText, { fontSize: size * 0.42 }]}>
            {fallbackInitial}
          </Text>
        </View>
      )}

      {showAccountStatusBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
            isApproved && styles.badgeApproved,
          ]}
        >
          {isApproved ? (
            <MaterialIcons name="check" size={iconSize} color="#FFFFFF" />
          ) : statusSpin ? (
            <Animated.View style={{ transform: [{ rotate: statusSpin }] }}>
              <MaterialIcons name="schedule" size={iconSize} color="#FFFFFF" />
            </Animated.View>
          ) : (
            <MaterialIcons name="schedule" size={iconSize} color="#FFFFFF" />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#F5F0E6",
  },
  image: {
    backgroundColor: "#F5F0E6",
  },
  fallback: {
    backgroundColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    backgroundColor: "#FF9800",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeApproved: {
    backgroundColor: "#22C55E",
  },
});
