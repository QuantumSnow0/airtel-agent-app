import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { Controller, Control, useWatch } from "react-hook-form";
import { CustomerRegistrationFormData } from "@/lib/validation/customerRegistrationSchemas";
import { registerStyles, modalStyles } from "../register/styles";
import { ALL_TOWNS, getInstallationLocationsForTown } from "@/constants/installationLocations";
import TownPickerModal from "../register/TownPickerModal";
import { useEffect, useState } from "react";

interface InstallationDetailsStepProps {
  control: Control<CustomerRegistrationFormData>;
  selectedTown: string;
  onTownChange: (town: string) => void;
}

export default function InstallationDetailsStep({
  control,
  selectedTown,
  onTownChange,
}: InstallationDetailsStepProps) {
  const [showTownPicker, setShowTownPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [isUsingCustomLocation, setIsUsingCustomLocation] = useState(false);

  const installationTown =
    useWatch({ control, name: "installationTown" }) || selectedTown || "";
  const installationLocations = installationTown
    ? getInstallationLocationsForTown(installationTown)
    : [];

  const { height: screenHeight } = Dimensions.get("window");
  const locationModalHeight = screenHeight * 0.75;
  const locationListHeight = locationModalHeight - 100;

  useEffect(() => {
    setIsUsingCustomLocation(false);
    setCustomLocation("");
  }, [installationTown]);

  return (
    <View style={registerStyles.form}>
      {/* Installation Town Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Installation Town</Text>
        <Controller
          control={control}
          name="installationTown"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                ]}
                onPress={() => setShowTownPicker(true)}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {value || "Select town"}
                </Text>
              </TouchableOpacity>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              <TownPickerModal
                visible={showTownPicker}
                selectedTown={value || ""}
                onClose={() => setShowTownPicker(false)}
                onSelectTown={(town) => {
                  onChange(town);
                  onTownChange(town);
                }}
                towns={ALL_TOWNS}
                modalTitle="Select installation town"
                modalSubtitle="Choose the town for customer installation"
              />
            </>
          )}
        />
      </View>

      {/* Installation Location Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Installation Location</Text>
        <Controller
          control={control}
          name="installationLocation"
          render={({ field: { onChange, value }, fieldState: { error } }) => {
            const showCustomInput =
              isUsingCustomLocation &&
              installationTown &&
              installationLocations.length > 0;

            return (
              <>
                {installationTown && installationLocations.length > 0 ? (
                  <>
                    {!showCustomInput ? (
                      <>
                        <TouchableOpacity
                          style={[
                            registerStyles.input,
                            error && registerStyles.inputError,
                            { justifyContent: "center" },
                          ]}
                          onPress={() => setShowLocationPicker(true)}
                        >
                          <Text
                            style={{
                              color: value ? "#333333" : "#999999",
                              fontFamily: "Inter_400Regular",
                            }}
                          >
                            {value || "Select location"}
                          </Text>
                        </TouchableOpacity>
                        <Modal
                          visible={showLocationPicker}
                          transparent
                          animationType="slide"
                          onRequestClose={() => setShowLocationPicker(false)}
                        >
                          <Pressable
                            style={modalStyles.modalOverlay}
                            onPress={() => setShowLocationPicker(false)}
                          >
                              <View
                                style={[
                                  modalStyles.modalContent,
                                  { height: locationModalHeight },
                                ]}
                                onStartShouldSetResponder={() => true}
                              >
                              <View style={modalStyles.modalHeader}>
                                <View style={modalStyles.modalHeaderLeft}>
                                  <View>
                                    <Text style={modalStyles.modalTitle}>
                                      Select installation location
                                    </Text>
                                    <Text style={modalStyles.modalSubtitle}>
                                      {installationTown}
                                    </Text>
                                  </View>
                                </View>
                                <TouchableOpacity
                                  onPress={() => setShowLocationPicker(false)}
                                  style={modalStyles.modalCloseButton}
                                  activeOpacity={0.7}
                                >
                                  <View style={modalStyles.modalCloseButtonInner}>
                                    <Text style={modalStyles.modalCloseText}>✕</Text>
                                  </View>
                                </TouchableOpacity>
                              </View>
                              <View
                                style={[
                                  modalStyles.modalListContainer,
                                  { height: locationListHeight },
                                ]}
                              >
                              <FlatList
                                data={installationLocations}
                                keyExtractor={(item) => item}
                                nestedScrollEnabled
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator
                                contentContainerStyle={modalStyles.modalListContent}
                                renderItem={({ item }) => {
                                  const isSelected = value === item;
                                  return (
                                    <TouchableOpacity
                                      style={[
                                        modalStyles.modalItem,
                                        isSelected && modalStyles.modalItemSelected,
                                      ]}
                                      onPress={() => {
                                        onChange(item);
                                        setShowLocationPicker(false);
                                        setCustomLocation("");
                                        setIsUsingCustomLocation(false);
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text
                                        style={[
                                          modalStyles.modalItemText,
                                          isSelected && modalStyles.modalItemTextSelected,
                                        ]}
                                      >
                                        {item}
                                      </Text>
                                      {isSelected ? (
                                        <View style={modalStyles.modalItemCheck}>
                                          <Text style={modalStyles.modalItemCheckText}>
                                            ✓
                                          </Text>
                                        </View>
                                      ) : null}
                                    </TouchableOpacity>
                                  );
                                }}
                                ListFooterComponent={
                                  <TouchableOpacity
                                    style={[
                                      modalStyles.modalItem,
                                      { backgroundColor: "#F8F9FA" },
                                    ]}
                                    onPress={() => {
                                      setShowLocationPicker(false);
                                      setCustomLocation("");
                                      setIsUsingCustomLocation(true);
                                      onChange("");
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: "Inter_500Medium",
                                        color: "#0066CC",
                                      }}
                                    >
                                      Other (Enter custom location)
                                    </Text>
                                  </TouchableOpacity>
                                }
                              />
                              </View>
                              </View>
                          </Pressable>
                        </Modal>
                      </>
                    ) : (
                      <TextInput
                        style={[
                          registerStyles.input,
                          { marginTop: 12 },
                          error && registerStyles.inputError,
                        ]}
                        placeholder="Enter custom location"
                        placeholderTextColor="#999999"
                        value={customLocation || value}
                        onChangeText={(text) => {
                          setCustomLocation(text);
                          onChange(text);
                        }}
                        autoCapitalize="words"
                      />
                    )}
                    {showCustomInput && (
                      <TouchableOpacity
                        onPress={() => {
                          setIsUsingCustomLocation(false);
                          setCustomLocation("");
                          onChange("");
                        }}
                        activeOpacity={0.7}
                        style={{ marginTop: 8, alignSelf: "flex-start" }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            color: "#0066CC",
                          }}
                        >
                          Choose from list instead
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <TextInput
                    style={[registerStyles.input, error && registerStyles.inputError]}
                    placeholder="Enter installation location"
                    placeholderTextColor="#999999"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                  />
                )}
                {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              </>
            );
          }}
        />
      </View>

      {/* Delivery Landmark Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Delivery Landmark</Text>
        <Controller
          control={control}
          name="deliveryLandmark"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter specific landmark or delivery location"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                multiline
                numberOfLines={2}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>
    </View>
  );
}
