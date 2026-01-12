import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Controller, Control } from "react-hook-form";
import { CustomerRegistrationFormData } from "@/lib/validation/customerRegistrationSchemas";
import { registerStyles } from "../register/styles";

interface CustomerInfoStepProps {
  control: Control<CustomerRegistrationFormData>;
}

export default function CustomerInfoStep({
  control,
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

      {/* Airtel Number Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Airtel Phone Number</Text>
        <Controller
          control={control}
          name="airtelNumber"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter Airtel number (e.g., 0712345678)"
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

