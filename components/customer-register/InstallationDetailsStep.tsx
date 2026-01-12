import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Controller, Control } from "react-hook-form";
import { CustomerRegistrationFormData } from "@/lib/validation/customerRegistrationSchemas";
import { registerStyles } from "../register/styles";
import { ALL_TOWNS, getInstallationLocationsForTown } from "@/constants/installationLocations";
import { useState } from "react";

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

  const installationLocations = selectedTown
    ? getInstallationLocationsForTown(selectedTown)
    : [];

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
                    fontFamily: value ? "Inter_400Regular" : "Inter_400Regular",
                  }}
                >
                  {value || "Select town"}
                </Text>
              </TouchableOpacity>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              {showTownPicker && (
                <View
                  style={{
                    position: "absolute",
                    top: 60,
                    left: 0,
                    right: 0,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E0E0E0",
                    maxHeight: 300,
                    zIndex: 1000,
                    elevation: 5,
                  }}
                >
                  <ScrollView>
                    {ALL_TOWNS.map((town) => (
                      <TouchableOpacity
                        key={town}
                        style={{
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: "#F0F0F0",
                        }}
                        onPress={() => {
                          onChange(town);
                          onTownChange(town);
                          setShowTownPicker(false);
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            color: "#333333",
                          }}
                        >
                          {town}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
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
            const isCustomLocation = value && !installationLocations.includes(value);
            const showCustomInput = isCustomLocation && selectedTown && installationLocations.length > 0;
            
            return (
              <>
                {selectedTown && installationLocations.length > 0 ? (
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
                    {showLocationPicker && (
                      <View
                        style={{
                          position: "absolute",
                          top: 60,
                          left: 0,
                          right: 0,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#E0E0E0",
                          maxHeight: 300,
                          zIndex: 1000,
                          elevation: 5,
                        }}
                      >
                        <ScrollView>
                          {installationLocations.map((location) => (
                            <TouchableOpacity
                              key={location}
                              style={{
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: "#F0F0F0",
                              }}
                              onPress={() => {
                                onChange(location);
                                setShowLocationPicker(false);
                                setCustomLocation("");
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter_400Regular",
                                  color: "#333333",
                                }}
                              >
                                {location}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={{
                              padding: 16,
                              borderBottomWidth: 1,
                              borderBottomColor: "#F0F0F0",
                              backgroundColor: "#F8F9FA",
                            }}
                            onPress={() => {
                              setShowLocationPicker(false);
                              setCustomLocation("");
                              onChange("");
                            }}
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
                        </ScrollView>
                      </View>
                    )}
                    {showCustomInput && (
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

