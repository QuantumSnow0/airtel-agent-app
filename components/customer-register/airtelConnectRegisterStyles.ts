import { StyleSheet } from "react-native";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "@/lib/utils/responsive";

export const AC = {
  red: "#E60012",
  redDark: "#C40010",
  redSoft: "#FFF0F1",
  redMuted: "#FFD6D9",
  ink: "#111827",
  inkSoft: "#374151",
  inkMuted: "#6B7280",
  inkFaint: "#9CA3AF",
  border: "#E5E7EB",
  divider: "#F3F4F6",
  surface: "#FFFFFF",
  canvas: "#F3F4F6",
  success: "#059669",
  successSoft: "#ECFDF5",
  danger: "#DC2626",
  warn: "#B45309",
  warnSoft: "#FFFBEB",
  warnBorder: "#FDE68A",
};

export const acStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AC.canvas,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: AC.surface,
    borderBottomWidth: 1,
    borderBottomColor: AC.border,
  },
  backBtn: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(19),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AC.canvas,
    marginRight: scaleWidth(10),
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(18),
    color: AC.ink,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkMuted,
    marginTop: scaleHeight(1),
  },

  flowStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(8),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(16),
    backgroundColor: AC.surface,
    borderBottomWidth: 1,
    borderBottomColor: AC.border,
  },
  flowChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(5),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(5),
    borderRadius: 999,
    backgroundColor: AC.canvas,
  },
  flowChipActive: {
    backgroundColor: AC.redSoft,
  },
  flowDot: {
    width: scaleWidth(7),
    height: scaleWidth(7),
    borderRadius: scaleWidth(4),
    backgroundColor: AC.inkFaint,
  },
  flowDotActive: {
    backgroundColor: AC.red,
  },
  flowLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(11),
    color: AC.inkMuted,
  },
  flowLabelActive: {
    color: AC.redDark,
  },
  flowArrow: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkFaint,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleWidth(16),
    paddingBottom: scaleHeight(24),
  },

  formCard: {
    backgroundColor: AC.surface,
    borderRadius: scaleWidth(16),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AC.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  section: {
    padding: scaleWidth(18),
  },
  sectionBorder: {
    borderTopWidth: 1,
    borderTopColor: AC.divider,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: AC.ink,
    marginBottom: scaleHeight(2),
  },
  sectionHint: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkMuted,
    marginBottom: scaleHeight(14),
  },

  field: {
    marginBottom: scaleHeight(14),
  },
  fieldLast: {
    marginBottom: 0,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(12),
    color: AC.inkSoft,
    marginBottom: scaleHeight(5),
  },
  input: {
    backgroundColor: AC.canvas,
    borderWidth: 1,
    borderColor: AC.border,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(13),
    paddingVertical: scaleHeight(12),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(15),
    color: AC.ink,
  },
  inputFocused: {
    borderColor: AC.inkSoft,
    backgroundColor: AC.surface,
  },
  inputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  inputMultiline: {
    minHeight: scaleHeight(72),
    textAlignVertical: "top",
    paddingTop: scaleHeight(12),
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(11),
    color: AC.danger,
    marginTop: scaleHeight(4),
  },

  packageRow: {
    flexDirection: "row",
    gap: scaleWidth(10),
    marginBottom: scaleHeight(14),
  },
  packageTile: {
    flex: 1,
    borderRadius: scaleWidth(12),
    borderWidth: 1.5,
    borderColor: AC.border,
    padding: scaleWidth(12),
    backgroundColor: AC.canvas,
  },
  packageTileSelected: {
    borderColor: AC.red,
    backgroundColor: AC.redSoft,
  },
  packageTileName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: AC.ink,
    textTransform: "capitalize",
  },
  packageTilePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(11),
    color: AC.inkMuted,
    marginTop: scaleHeight(2),
  },
  packageTileEarn: {
    fontFamily: "Inter_700Bold",
    fontSize: scaleFont(11),
    color: AC.success,
    marginTop: scaleHeight(6),
  },
  popularTag: {
    position: "absolute",
    top: -scaleHeight(7),
    right: scaleWidth(8),
    backgroundColor: AC.red,
    borderRadius: 999,
    paddingHorizontal: scaleWidth(6),
    paddingVertical: scaleHeight(1),
  },
  popularTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: scaleFont(8),
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AC.canvas,
    borderRadius: scaleWidth(10),
    borderWidth: 1,
    borderColor: AC.border,
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
  },
  qtyBtn: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(8),
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.35,
  },
  qtyCenter: {
    alignItems: "center",
  },
  qtyValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(20),
    color: AC.ink,
  },
  qtyUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(10),
    color: AC.inkMuted,
  },

  commissionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(8),
    marginTop: scaleHeight(14),
    padding: scaleWidth(12),
    borderRadius: scaleWidth(10),
    backgroundColor: AC.successSoft,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  commissionText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(12),
    color: "#065F46",
    lineHeight: scaleFont(17),
  },
  commissionAmount: {
    fontFamily: "Poppins_700Bold",
    color: AC.success,
  },

  footer: {
    backgroundColor: AC.surface,
    borderTopWidth: 1,
    borderTopColor: AC.border,
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(12),
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(8),
    backgroundColor: AC.red,
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(15),
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
    color: "#FFFFFF",
  },
  footerError: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.danger,
    textAlign: "center",
    marginBottom: scaleHeight(8),
  },
  footerHelp: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(11),
    color: AC.inkMuted,
    textAlign: "center",
    marginTop: scaleHeight(10),
  },
  footerHelpLink: {
    fontFamily: "Inter_600SemiBold",
    color: AC.red,
  },

  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(10),
    backgroundColor: AC.warnSoft,
    borderWidth: 1,
    borderColor: AC.warnBorder,
    borderRadius: scaleWidth(12),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(12),
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.warn,
    lineHeight: scaleFont(18),
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AC.canvas,
    gap: scaleHeight(12),
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(14),
    color: AC.inkMuted,
  },
});
