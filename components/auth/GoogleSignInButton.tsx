import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const ICON_SLOT = 48;

type AuthMethodButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
  imageSource?: ImageSourcePropType;
  materialIcon?: keyof typeof MaterialIcons.glyphMap;
  variant?: "outline" | "filled";
};

export function AuthMethodButton({
  onPress,
  loading = false,
  disabled = false,
  title,
  subtitle,
  style,
  imageSource,
  materialIcon,
  variant = "outline",
}: AuthMethodButtonProps) {
  const filled = variant === "filled";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        filled && styles.buttonFilled,
        (loading || disabled) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={filled ? "#FFFFFF" : "#333333"} />
      ) : (
        <View style={styles.row}>
          <View style={styles.iconSlot}>
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.imageIcon}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            ) : materialIcon ? (
              <MaterialIcons
                name={materialIcon}
                size={36}
                color={filled ? "#FFFFFF" : "#333333"}
              />
            ) : null}
          </View>
          <View style={styles.textColumn}>
            <Text
              style={[styles.title, filled && styles.titleFilled]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={[styles.subtitle, filled && styles.subtitleFilled]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
          {/* Balance the left icon so title stays visually centered */}
          <View style={styles.iconSlot} />
        </View>
      )}
    </TouchableOpacity>
  );
}

type GoogleSignInButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  label = "Continue with Google",
  subtitle = "Fast, secure and recommended",
  style,
}: GoogleSignInButtonProps) {
  return (
    <AuthMethodButton
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      title={label}
      subtitle={subtitle}
      style={style}
      imageSource={require("../../assets/images/google-oauth.jpg")}
      variant="outline"
    />
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 80,
  },
  buttonFilled: {
    backgroundColor: "#0066CC",
    borderColor: "#0066CC",
  },
  disabled: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 44,
  },
  iconSlot: {
    width: ICON_SLOT,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  imageIcon: {
    width: 42,
    height: 42,
  },
  textColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    minHeight: 44,
  },
  title: {
    color: "#333333",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  titleFilled: {
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    color: "#666666",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  subtitleFilled: {
    color: "rgba(255,255,255,0.85)",
  },
});
