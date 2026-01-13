import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { openAppStore, getCurrentAppVersion } from "../lib/services/appVersionService";
import {
  getCardPadding,
  getResponsivePadding,
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

export default function UpdateRequiredScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { version } = getCurrentAppVersion();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleUpdate = async () => {
    await openAppStore();
  };

  if (!fontsLoaded) {
    return null;
  }

  const styles = createStyles(insets);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📱</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Update Required</Text>

        {/* Message */}
        <Text style={styles.message}>
          A new version of the app is available. Please update to continue using
          the app.
        </Text>

        {/* Current Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionLabel}>Current Version:</Text>
          <Text style={styles.versionValue}>{version}</Text>
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
          activeOpacity={0.7}
        >
          <Text style={styles.updateButtonText}>
            Update from {Platform.OS === "ios" ? "App Store" : "Play Store"}
          </Text>
        </TouchableOpacity>

        {/* Support Info */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportText}>
            Need help? Contact support at{" "}
            <Text
              style={styles.supportLink}
              onPress={() => Linking.openURL("tel:0700776994")}
            >
              0700776994
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (insets: { top: number; bottom: number }) => {
  const padding = getResponsivePadding();
  const cardPadding = getCardPadding();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#FFFFFF",
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: padding,
    },
    iconContainer: {
      marginBottom: scaleHeight(24),
    },
    icon: {
      fontSize: scaleFont(64),
    },
    title: {
      fontSize: scaleFont(28),
      fontFamily: "Poppins_700Bold",
      color: "#1A1A1A",
      textAlign: "center",
      marginBottom: scaleHeight(16),
    },
    message: {
      fontSize: scaleFont(16),
      fontFamily: "Inter_400Regular",
      color: "#666666",
      textAlign: "center",
      lineHeight: scaleFont(24),
      marginBottom: scaleHeight(32),
      paddingHorizontal: scaleWidth(20),
    },
    versionContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: scaleHeight(32),
      paddingHorizontal: scaleWidth(20),
      paddingVertical: scaleHeight(12),
      backgroundColor: "#F5F5F5",
      borderRadius: scaleWidth(8),
    },
    versionLabel: {
      fontSize: scaleFont(14),
      fontFamily: "Inter_500Medium",
      color: "#666666",
      marginRight: scaleWidth(8),
    },
    versionValue: {
      fontSize: scaleFont(14),
      fontFamily: "Inter_600SemiBold",
      color: "#1A1A1A",
    },
    updateButton: {
      backgroundColor: "#0066CC",
      paddingHorizontal: scaleWidth(32),
      paddingVertical: scaleHeight(16),
      borderRadius: scaleWidth(8),
      marginBottom: scaleHeight(24),
      minWidth: scaleWidth(200),
    },
    updateButtonText: {
      color: "#FFFFFF",
      fontSize: scaleFont(16),
      fontFamily: "Poppins_600SemiBold",
      textAlign: "center",
    },
    supportContainer: {
      marginTop: scaleHeight(24),
      paddingHorizontal: scaleWidth(20),
    },
    supportText: {
      fontSize: scaleFont(14),
      fontFamily: "Inter_400Regular",
      color: "#666666",
      textAlign: "center",
      lineHeight: scaleFont(20),
    },
    supportLink: {
      color: "#0066CC",
      fontFamily: "Inter_600SemiBold",
      textDecorationLine: "underline",
    },
  });
};

