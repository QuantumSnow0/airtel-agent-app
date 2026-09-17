import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { PlaceMapPreview } from "../components/PlaceMapPreview";
import { getCachedAgentData } from "../lib/cache/agentCache";
import { parseGooglePlace } from "../lib/google-places/parseGooglePlace";
import type {
  PlacesPrediction,
  SelectedGooglePlace,
} from "../lib/google-places/types";
import { usePlacesSearch } from "../lib/google-places/usePlacesSearch";
import { saveAgentWorkingPlace } from "../lib/services/workingPlaceService";
import { supabase } from "../lib/supabase";
import { scaleHeight } from "../lib/utils/responsive";

export default function SetWorkingLocationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { skipIntro: skipIntroParam } = useLocalSearchParams<{
    skipIntro?: string | string[];
  }>();
  const skipIntro =
    skipIntroParam === "1" ||
    (Array.isArray(skipIntroParam) && skipIntroParam[0] === "1");
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState<SelectedGooglePlace | null>(null);
  const [hadPlace, setHadPlace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"intro" | "search">(
    skipIntro ? "search" : "intro",
  );

  const {
    query,
    predictions,
    status,
    loading: searching,
    handleChange,
    selectPrediction,
  } = usePlacesSearch(place, setPlace);

  const loadExisting = useCallback(async () => {
    const cached = await getCachedAgentData();
    const cachedPlace = parseGooglePlace(cached?.working_place);
    if (cachedPlace) {
      setPlace(cachedPlace);
      setHadPlace(true);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login" as any);
      return;
    }

    const { data } = await supabase
      .from("agents")
      .select("working_place")
      .eq("id", user.id)
      .maybeSingle();
    const existing = parseGooglePlace(data?.working_place);
    if (existing) {
      setPlace(existing);
      setHadPlace(true);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  const required = !hadPlace;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !required });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [navigation, required]);

  useEffect(() => {
    if (!required) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "search") {
        setStep("intro");
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, [required, step]);

  const onSave = async () => {
    if (!place) return;
    setSaving(true);
    const result = await saveAgentWorkingPlace(place);
    setSaving(false);
    if (!result.ok) {
      Alert.alert("Could not save", result.error);
      return;
    }
    router.replace("/dashboard" as any);
  };

  const showList = !place && (predictions.length > 0 || Boolean(status));

  const renderRow = ({ item }: { item: PlacesPrediction }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => void selectPrediction(item)}
      activeOpacity={0.65}
    >
      <View style={styles.rowIcon}>
        <MaterialIcons name="place" size={16} color="#64748B" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {item.label}
        </Text>
        {item.secondary ? (
          <Text style={styles.rowSecondary} numberOfLines={1}>
            {item.secondary}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (step === "intro") {
    return (
      <View style={[styles.introPage, { paddingTop: insets.top }]}>
        {hadPlace ? (
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.introBody}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <Text style={styles.introTitle}>
            {hadPlace
              ? "Update your working location"
              : "Set your working location"}
          </Text>
          <Text style={styles.introSub}>
            Choose a landmark where you normally take jobs. We’ll use it to find
            nearby jobs and show you how far they are.
          </Text>
          <Text style={styles.introNote}>
            You can update it anytime from Home.
          </Text>
        </View>

        <View style={styles.mapStage} pointerEvents="none">
          <Image
            source={require("../assets/images/map-icon.png")}
            style={styles.mapBg}
            contentFit="contain"
          />
        </View>

        <View
          style={[styles.introFooter, { paddingBottom: insets.bottom + 56 }]}
        >
          <TouchableOpacity
            style={styles.pillBtn}
            onPress={() => setStep("search")}
            activeOpacity={0.85}
          >
            <Text style={styles.pillBtnText}>
              {hadPlace ? "Change location" : "Choose your location"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.top}>
          <TouchableOpacity
            onPress={() => {
              if (skipIntro || (hadPlace && !query)) {
                router.back();
                return;
              }
              setStep("intro");
            }}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.searchTitle}>Search a landmark</Text>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={handleChange}
              placeholder="e.g. Naivas Westlands"
              placeholderTextColor="#999999"
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              autoFocus
            />
            {searching ? (
              <ActivityIndicator
                size="small"
                color="#0066CC"
                style={styles.searchIcon}
              />
            ) : query.length > 0 ? (
              <TouchableOpacity
                onPress={() => handleChange("")}
                style={styles.searchIcon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={18} color="#999999" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {showList ? (
          status && predictions.length === 0 ? (
            <Text style={styles.status}>{status}</Text>
          ) : (
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.placeId}
              keyboardShouldPersistTaps="handled"
              style={styles.results}
              contentContainerStyle={styles.resultsContent}
              renderItem={renderRow}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )
        ) : place ? (
          <View style={styles.confirm}>
            <PlaceMapPreview
              lat={place.lat}
              lng={place.lng}
              label={place.name}
              showOpenButton={false}
              embedded
              height={scaleHeight(240)}
            />
            <View style={styles.confirmCopy}>
              <Text style={styles.placeName}>{place.name}</Text>
              {place.formattedAddress ? (
                <Text style={styles.placeAddress}>
                  {place.formattedAddress}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.pillBtn,
                styles.saveBtn,
                { marginBottom: Math.max(insets.bottom, 24) },
              ]}
              onPress={() => void onSave()}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.pillBtnText}>
                  {hadPlace ? "Save location" : "Continue"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.empty}>
            <Image
              source={require("../assets/images/location-icon.png")}
              style={styles.emptyMap}
              contentFit="contain"
            />
            <Text style={styles.emptyTitle}>Start typing a landmark</Text>
            <Text style={styles.emptySub}>
              Try a shop, church, or building near where you work. Pick it from
              the list, then confirm on the map.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFD",
  },
  flex: { flex: 1 },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  introPage: {
    flex: 1,
    backgroundColor: "#E8F1FC",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    zIndex: 2,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  introBody: {
    paddingHorizontal: 28,
    paddingTop: 72,
  },
  mapStage: {
    flex: 1,
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: -8,
  },
  mapBg: {
    width: "100%",
    height: "100%",
    marginTop: -24,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 28,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  logo: {
    width: 72,
    height: 72,
  },
  introTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Poppins_600SemiBold",
    color: "#111111",
    marginBottom: 14,
  },
  introSub: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    maxWidth: 340,
  },
  introNote: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    maxWidth: 340,
  },
  introFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  pillBtn: {
    backgroundColor: "#0066CC",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  pillBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  top: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  searchTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  search: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
  },
  searchIcon: {
    marginRight: 12,
  },
  results: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  resultsContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1A1A1A",
  },
  rowSecondary: {
    marginTop: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EEEEEE",
    marginLeft: 54,
  },
  status: {
    paddingHorizontal: 24,
    paddingTop: 16,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  emptyMap: {
    width: "100%",
    height: scaleHeight(240),
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    maxWidth: 300,
  },
  confirm: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  confirmCopy: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  placeName: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
  },
  placeAddress: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: 20,
  },
  saveBtn: {
    marginHorizontal: 24,
    marginTop: 20,
  },
});
