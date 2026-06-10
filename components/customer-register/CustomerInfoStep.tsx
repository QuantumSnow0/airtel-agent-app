import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Controller, Control } from "react-hook-form";
import { CustomerRegistrationFormData } from "@/lib/validation/customerRegistrationSchemas";
import { registerStyles } from "../register/styles";

interface CustomerInfoStepProps {
  control: Control<CustomerRegistrationFormData>;
  standardCommissionKsh?: number;
  premiumCommissionKsh?: number;
}

export default function CustomerInfoStep({
  control,
  standardCommissionKsh,
  premiumCommissionKsh,
}: CustomerInfoStepProps) {
  return (
    <View style={registerStyles.form}>
      {/* Customer Name Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Customer Name</Text>
        <Controller
          control={control}
          name="customerName"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter customer's full name"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Primary Number Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Primary Phone Number</Text>
        <Controller
          control={control}
          name="airtelNumber"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter primary number (e.g., 0712345678)"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Alternate Number Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Alternate Phone Number</Text>
        <Controller
          control={control}
          name="alternateNumber"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter alternate number (e.g., 0712345678)"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Email Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Email Address</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter customer's email"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Quantity Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Quantity (units)</Text>
        <Controller
          control={control}
          name="unitsRequired"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E0E0E0",
                    backgroundColor: "#F8F9FA",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => onChange(Math.max(1, (value ?? 1) - 1))}
                >
                  <Text style={{ fontSize: 20, color: "#333333" }}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={[
                    registerStyles.input,
                    error && registerStyles.inputError,
                    { flex: 1, textAlign: "center" },
                  ]}
                  placeholder="1"
                  placeholderTextColor="#999999"
                  value={String(value ?? 1)}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, "");
                    onChange(digits === "" ? 1 : Number(digits));
                  }}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <TouchableOpacity
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#E0E0E0",
                    backgroundColor: "#F8F9FA",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => onChange(Math.min(99, (value ?? 1) + 1))}
                >
                  <Text style={{ fontSize: 20, color: "#333333" }}>+</Text>
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: "#999999",
                }}
              >
                Default is 1 device per registration
              </Text>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Preferred Package Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Preferred Package</Text>
        <Controller
          control={control}
          name="preferredPackage"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={[
                    {
                      flex: 1,
                      padding: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      backgroundColor: value === "standard" ? "#0066CC" : "#FFFFFF",
                      borderColor: value === "standard" ? "#0066CC" : "#E0E0E0",
                    },
                  ]}
                  onPress={() => onChange("standard")}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontFamily: "Inter_500Medium",
                      color: value === "standard" ? "#FFFFFF" : "#333333",
                    }}
                  >
                    Standard
                  </Text>
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: value === "standard" ? "#FFFFFF" : "#999999",
                      marginTop: 4,
                    }}
                  >
                    Ksh. 2,999
                  </Text>
                  {standardCommissionKsh != null ? (
                    <Text
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        fontFamily: "Inter_500Medium",
                        color: value === "standard" ? "#E8F4FF" : "#0066CC",
                        marginTop: 4,
                      }}
                    >
                      Earn KSh {standardCommissionKsh.toLocaleString()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    {
                      flex: 1,
                      padding: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      backgroundColor: value === "premium" ? "#0066CC" : "#FFFFFF",
                      borderColor: value === "premium" ? "#0066CC" : "#E0E0E0",
                    },
                  ]}
                  onPress={() => onChange("premium")}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontFamily: "Inter_500Medium",
                      color: value === "premium" ? "#FFFFFF" : "#333333",
                    }}
                  >
                    Premium
                  </Text>
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: value === "premium" ? "#FFFFFF" : "#999999",
                      marginTop: 4,
                    }}
                  >
                    Ksh. 3,999
                  </Text>
                  {premiumCommissionKsh != null ? (
                    <Text
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        fontFamily: "Inter_500Medium",
                        color: value === "premium" ? "#E8F4FF" : "#0066CC",
                        marginTop: 4,
                      }}
                    >
                      Earn KSh {premiumCommissionKsh.toLocaleString()}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              </View>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>
    </View>
  );
}

