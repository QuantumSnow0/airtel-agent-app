import { View, Text, TextInput, TouchableOpacity, Platform, ScrollView } from "react-native";
import { Controller, Control } from "react-hook-form";
import { ContactInfoFormData } from "@/lib/validation/registerSchemas";
import { registerStyles } from "./styles";

interface ContactInfoStepProps {
  control: Control<ContactInfoFormData>;
  scrollViewRef: React.RefObject<ScrollView | null>;
  onOpenTownPicker: () => void;
}

export default function ContactInfoStep({
  control,
  scrollViewRef,
  onOpenTownPicker,
}: ContactInfoStepProps) {

  return (
    <View style={registerStyles.form}>
      {/* Airtel Phone Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Airtel Phone Number</Text>
        <Controller
          control={control}
          name="airtelPhone"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter your Airtel number"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={() => {
                  // KeyboardAvoidingView will handle the layout adjustment
                  // No need to manually scroll
                }}
                keyboardType="phone-pad"
                maxLength={16}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Safaricom Phone Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Safaricom Phone Number</Text>
        <Controller
          control={control}
          name="safaricomPhone"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter your Safaricom number"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={() => {
                  // KeyboardAvoidingView will handle the layout adjustment
                  // No need to manually scroll
                }}
                keyboardType="phone-pad"
                maxLength={16}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Town Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Town</Text>
        <Controller
          control={control}
          name="town"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  registerStyles.dropdownButton,
                  error && registerStyles.inputError,
                ]}
                onPress={onOpenTownPicker}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    registerStyles.dropdownText,
                    !value && registerStyles.dropdownPlaceholder,
                  ]}
                >
                  {value || "Select town"}
                </Text>
                <Text style={registerStyles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Area Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Area</Text>
        <Controller
          control={control}
          name="area"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter area"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={() => {
                  // KeyboardAvoidingView will handle the layout adjustment
                }}
                autoCapitalize="words"
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>
    </View>
  );
}

