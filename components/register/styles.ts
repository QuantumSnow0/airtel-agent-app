import { StyleSheet } from "react-native";

export const registerStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 300, // Increased padding to ensure all fields are accessible even without keyboard
  },
  
  // Header styles
  header: {
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  
  // Form styles
  form: {
    // Remove flex to prevent unused space
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#333333",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 80,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 14,
    paddingVertical: 4,
  },
  eyeButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FF3B30",
    marginTop: 4,
  },
  
  // Button styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0066CC",
    shadowColor: "#0066CC",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  
  // Dropdown styles
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: "#999999",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#666666",
  },
});

export const modalStyles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    width: "100%",
    flexDirection: "column",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexShrink: 0, // Prevent header from shrinking
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E6F2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalIcon: {
    fontSize: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    letterSpacing: 0.2,
  },
  modalCloseButton: {
    marginLeft: 16,
  },
  modalCloseButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#666666",
    fontFamily: "Inter_500Medium",
  },
  modalSearchContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexShrink: 0, // Prevent search bar from shrinking
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalSearchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    padding: 0,
  },
  modalSearchClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  modalSearchClearText: {
    fontSize: 12,
    color: "#666666",
    fontFamily: "Inter_500Medium",
  },
  modalListContainer: {
    minHeight: 300, // Fallback minimum height, actual height set dynamically
  },
  modalList: {
    flex: 1,
  },
  modalListContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    backgroundColor: "#FFFFFF",
  },
  modalItemSelected: {
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    letterSpacing: 0.2,
    flex: 1,
  },
  modalItemTextSelected: {
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  modalItemCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  modalItemCheckText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  modalEmpty: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalEmptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  modalEmptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  modalEmptyButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#333333",
  },
});

