import { View, Text, TextInput, ScrollView } from "react-native";
import { Controller, Control } from "react-hook-form";
import { ContactInfoFormData } from "@/lib/validation/registerSchemas";
import { registerStyles } from "./styles";
import { PlacesLocationSearch } from "@/components/PlacesLocationSearch";
import type { SelectedGooglePlace } from "@/lib/google-places/types";

interface ContactInfoStepProps {
  control: Control<ContactInfoFormData>;
  scrollViewRef: React.RefObject<ScrollView | null>;
}

export default function ContactInfoStep({
  control,
}: ContactInfoStepProps) {
  return (
    <View style={registerStyles.form}>
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Primary Phone Number</Text>
        <Controller
          control={control}
          name="airtelPhone"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter your primary number"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                maxLength={16}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

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
                keyboardType="phone-pad"
                maxLength={16}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Working location</Text>
        <Text style={registerStyles.helperText}>
          Search and pick a landmark — a shop, church, or building. Not a city
          or county.
        </Text>
        <Controller
          control={control}
          name="workingPlace"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <PlacesLocationSearch
              selected={(value as SelectedGooglePlace | null) ?? null}
              onSelect={onChange}
              error={error?.message}
            />
          )}
        />
      </View>
    </View>
  );
}
