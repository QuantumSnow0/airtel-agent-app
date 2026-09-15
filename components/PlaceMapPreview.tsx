import { Image } from "expo-image";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { scaleFont, scaleHeight, scaleWidth } from "../lib/utils/responsive";

type PlaceMapPreviewProps = {
  lat: number;
  lng: number;
  label?: string;
  showOpenButton?: boolean;
  height?: number;
  embedded?: boolean;
};

export function PlaceMapPreview({
  lat,
  lng,
  label,
  showOpenButton = true,
  height,
  embedded = false,
}: PlaceMapPreviewProps) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const staticUrl = key
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x280&scale=2&markers=color:red%7C${lat},${lng}&key=${key}`
    : null;

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      {staticUrl ? (
        <Image
          source={{ uri: staticUrl }}
          style={[styles.map, height != null && { height }]}
          contentFit="cover"
          transition={0}
        />
      ) : (
        <View style={[styles.map, styles.mapFallback, height != null && { height }]}>
          <Text style={styles.fallbackText}>{label || "Map"}</Text>
        </View>
      )}
      {showOpenButton ? (
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => void Linking.openURL(mapsUrl)}
          activeOpacity={0.8}
        >
          <Text style={styles.openBtnText}>Open in Maps</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: scaleWidth(12),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#F8FAFC",
  },
  wrapEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
  },
  map: {
    width: "100%",
    height: scaleHeight(132),
    backgroundColor: "#E2E8F0",
  },
  mapFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(13),
    color: "#64748B",
  },
  openBtn: {
    paddingVertical: scaleHeight(10),
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  openBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(13),
    color: "#0066CC",
  },
});
