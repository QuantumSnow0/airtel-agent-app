import { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  HELP_FAQS,
  SUPPORT_PHONE,
  SUPPORT_PHONE_TEL,
} from "../constants/helpContent";
import {
  scaleFont,
  scaleHeight,
} from "../lib/utils/responsive";

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need help?</Text>
          <Text style={styles.supportBody}>
            Call our support team for account, payment, or registration issues.
          </Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(SUPPORT_PHONE_TEL)}
            activeOpacity={0.85}
          >
            <Text style={styles.callBtnText}>📞 Call {SUPPORT_PHONE}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick links</Text>
        <View style={styles.linksCard}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/earnings-history" as any)}
          >
            <Text style={styles.linkText}>Payment history</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/(tabs)/registrations" as any)}
          >
            <Text style={styles.linkText}>My registrations</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/notifications" as any)}
          >
            <Text style={styles.linkText}>Notifications</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkRow, styles.linkRowLast]}
            onPress={() => router.push("/privacy-policy" as any)}
          >
            <Text style={styles.linkText}>Privacy policy</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Frequently asked</Text>
        {HELP_FAQS.map((faq, index) => {
          const isOpen = expandedIndex === index;
          return (
            <TouchableOpacity
              key={faq.question}
              style={styles.faqCard}
              onPress={() => setExpandedIndex(isOpen ? null : index)}
              activeOpacity={0.85}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqToggle}>{isOpen ? "−" : "+"}</Text>
              </View>
              {isOpen ? (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backBtn: { padding: 8, marginRight: 8 },
  backBtnText: { fontSize: 24, color: "#0066CC" },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  content: { padding: 16 },
  supportCard: {
    backgroundColor: "#0066CC",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  supportBody: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: scaleFont(20),
    marginBottom: 14,
  },
  callBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  callBtnText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
  },
  sectionTitle: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  linksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  linkRowLast: { borderBottomWidth: 0 },
  linkText: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_500Medium",
    color: "#333333",
  },
  linkArrow: {
    fontSize: 20,
    color: "#CCCCCC",
  },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#333333",
  },
  faqToggle: {
    fontSize: 20,
    color: "#0066CC",
    lineHeight: 22,
  },
  faqAnswer: {
    marginTop: scaleHeight(10),
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: scaleFont(20),
  },
});
