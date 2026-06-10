import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

const PLAY_STORE_PACKAGE = "com.wam.apps";
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

type PromptStep = "enjoy" | "playstore" | "thanks";

type AppRatingPromptProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Called when the agent submits an in-app star rating. */
  onRated?: (score: number) => void | Promise<void>;
  /** Called when the agent taps through to the Play Store. */
  onPlayStoreOpened?: () => void | Promise<void>;
  onComplete?: () => void;
};

export function AppRatingPrompt({
  visible,
  onDismiss,
  onRated,
  onPlayStoreOpened,
  onComplete,
}: AppRatingPromptProps) {
  const [step, setStep] = useState<PromptStep>("enjoy");
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep("enjoy");
    setSelectedRating(0);
    setHoverRating(0);
    setIsWorking(false);
  }, [visible]);

  const displayRating = hoverRating || selectedRating;

  const handleDismiss = () => {
    if (isWorking) return;
    onDismiss();
  };

  const handleContinue = async () => {
    if (selectedRating < 1 || isWorking) return;

    setIsWorking(true);
    try {
      await onRated?.(selectedRating);
      setStep(selectedRating >= 4 ? "playstore" : "thanks");
    } finally {
      setIsWorking(false);
    }
  };

  const openPlayStore = async () => {
    setIsWorking(true);
    try {
      await onPlayStoreOpened?.();
      const marketUrl =
        Platform.OS === "android" ? PLAY_STORE_MARKET_URL : PLAY_STORE_URL;
      const canOpenMarket = await Linking.canOpenURL(marketUrl);
      await Linking.openURL(canOpenMarket ? marketUrl : PLAY_STORE_URL);
      onComplete?.();
    } catch {
      try {
        await Linking.openURL(PLAY_STORE_URL);
        onComplete?.();
      } catch {
        // User can try again from profile
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleFinish = () => {
    onComplete?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {step === "enjoy" ? (
            <>
              <Text style={styles.icon}>⭐</Text>
              <Text style={styles.title}>Enjoying WAM Apps?</Text>
              <Text style={styles.body}>
                Your feedback helps us improve the experience for every agent.
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= displayRating;
                  return (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => setSelectedRating(star)}
                      onPressIn={() => setHoverRating(star)}
                      onPressOut={() => setHoverRating(0)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
                    >
                      <MaterialIcons
                        name={filled ? "star" : "star-border"}
                        size={scaleWidth(40)}
                        color={filled ? "#F5A623" : "#C8C8C8"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.ratingHint}>
                {displayRating > 0
                  ? RATING_LABELS[displayRating]
                  : "Tap a star to rate"}
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  selectedRating < 1 && styles.primaryBtnDisabled,
                ]}
                onPress={handleContinue}
                disabled={selectedRating < 1 || isWorking}
                activeOpacity={0.85}
              >
                {isWorking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleDismiss}
                disabled={isWorking}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Not now</Text>
              </TouchableOpacity>
            </>
          ) : step === "playstore" ? (
            <>
              <View style={styles.playStoreBadge}>
                <MaterialIcons
                  name="shop"
                  size={scaleWidth(28)}
                  color="#0066CC"
                />
              </View>
              <Text style={styles.title}>Thank you!</Text>
              <Text style={styles.body}>
                We're glad you're enjoying the app. Would you mind rating us on
                the Play Store? It only takes a moment and helps other agents
                discover WAM Apps.
              </Text>

              <View style={styles.selectedStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= selectedRating ? "star" : "star-border"}
                    size={scaleWidth(22)}
                    color={star <= selectedRating ? "#F5A623" : "#D8D8D8"}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.playStoreBtn}
                onPress={openPlayStore}
                disabled={isWorking}
                activeOpacity={0.85}
              >
                {isWorking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons
                      name="star"
                      size={scaleWidth(20)}
                      color="#FFFFFF"
                    />
                    <Text style={styles.playStoreBtnText}>
                      Rate on Play Store
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleFinish}
                disabled={isWorking}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Maybe later</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.icon}>🙏</Text>
              <Text style={styles.title}>Thanks for your feedback</Text>
              <Text style={styles.body}>
                We appreciate you taking the time to rate us. We're always
                working to make WAM Apps better for agents like you.
              </Text>

              <View style={styles.selectedStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= selectedRating ? "star" : "star-border"}
                    size={scaleWidth(22)}
                    color={star <= selectedRating ? "#F5A623" : "#D8D8D8"}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleFinish}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Got it</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: scaleWidth(24),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: scaleFont(32),
    textAlign: "center",
    marginBottom: scaleHeight(8),
  },
  title: {
    fontSize: scaleFont(20),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: scaleHeight(8),
  },
  body: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_400Regular",
    color: "#555555",
    textAlign: "center",
    lineHeight: scaleFont(21),
    marginBottom: scaleHeight(18),
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scaleWidth(4),
    marginBottom: scaleHeight(8),
  },
  starButton: {
    padding: scaleWidth(4),
  },
  ratingHint: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    textAlign: "center",
    marginBottom: scaleHeight(18),
    minHeight: scaleHeight(20),
  },
  selectedStarsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scaleWidth(2),
    marginBottom: scaleHeight(18),
  },
  playStoreBadge: {
    alignSelf: "center",
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(28),
    backgroundColor: "#E8F2FC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(12),
  },
  primaryBtn: {
    backgroundColor: "#0066CC",
    borderRadius: 10,
    minHeight: scaleHeight(48),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(10),
  },
  primaryBtnDisabled: {
    backgroundColor: "#A8C8E8",
  },
  primaryBtnText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  playStoreBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    minHeight: scaleHeight(48),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(8),
    marginBottom: scaleHeight(10),
  },
  playStoreBtnText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(8),
  },
  secondaryBtnText: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_500Medium",
    color: "#888888",
  },
});
