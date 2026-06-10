import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Controller, Control } from "react-hook-form";
import type { SafaricomRegistrationFormData } from "../../lib/validation/safaricomRegistrationSchemas";
import { registerStyles } from "../register/styles";

type Props = {
  control: Control<SafaricomRegistrationFormData>;
};

export default function SafaricomCustomerInfoStep({ control }: Props) {
  const [showDobPicker, setShowDobPicker] = useState(false);

  const formatDobDisplay = (isoDate: string): string => {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const toIsoDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDob = (v?: string): Date => {
    if (!v) return new Date(1995, 0, 1);
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return new Date(1995, 0, 1);
    return d;
  };

  return (
    <View style={registerStyles.form}>
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Customer Name</Text>
        <Controller
          control={control}
          name="customerName"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <>
              <TextInput
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                ]}
                placeholder="Enter customer's full name"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
              />
              {error && (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              )}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Safaricom Number</Text>
        <Controller
          control={control}
          name="safaricomNumber"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <>
              <TextInput
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                ]}
                placeholder="e.g. 0712345678"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
              />
              {error && (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              )}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Alternate Number</Text>
        <Controller
          control={control}
          name="alternateNumber"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <>
              <TextInput
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                ]}
                placeholder="Optional — other contact number"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
              />
              {error && (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              )}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Email Address</Text>
        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <>
              <TextInput
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                ]}
                placeholder="customer@example.com"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error && (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              )}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Identification Number</Text>
        <Controller
          control={control}
          name="identificationNumber"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <>
              <TextInput
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                ]}
                placeholder="National ID or passport number"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="characters"
              />
              {error && (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              )}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Date of Birth</Text>
        <Controller
          control={control}
          name="dateOfBirth"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error },
          }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                ]}
                onPress={() => setShowDobPicker(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {value ? formatDobDisplay(value) : "Select date of birth"}
                </Text>
              </TouchableOpacity>
              {showDobPicker ? (
                <View style={{ marginTop: 10 }}>
                  <DateTimePicker
                    value={parseDob(value)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (Platform.OS === "android") {
                        setShowDobPicker(false);
                      }
                      if (event.type === "set" && selectedDate) {
                        onChange(toIsoDate(selectedDate));
                        onBlur();
                      }
                    }}
                  />
                  {Platform.OS === "ios" ? (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: "#F3F4F6",
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: "center",
                        }}
                        onPress={() => setShowDobPicker(false)}
                      >
                        <Text style={{ color: "#666666", fontFamily: "Inter_500Medium" }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: "#0066CC",
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: "center",
                        }}
                        onPress={() => {
                          setShowDobPicker(false);
                          onBlur();
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontFamily: "Poppins_600SemiBold" }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {error && (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              )}
            </>
          )}
        />
      </View>
    </View>
  );
}
