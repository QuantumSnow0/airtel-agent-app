import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Control,
  Controller,
  UseFormClearErrors,
  UseFormSetValue,
} from "react-hook-form";
import { KENYAN_COUNTIES } from "../../constants/kenyanCounties";
import type { SafaricomRegistrationFormData } from "../../lib/validation/safaricomRegistrationSchemas";
import { modalStyles, registerStyles } from "../register/styles";

type Props = {
  control: Control<SafaricomRegistrationFormData>;
  setValue: UseFormSetValue<SafaricomRegistrationFormData>;
  clearErrors: UseFormClearErrors<SafaricomRegistrationFormData>;
};

export default function SafaricomPortableDedicatedInstallStep({
  control,
  setValue,
  clearErrors,
}: Props) {
  const [countyModal, setCountyModal] = useState(false);

  const onPickCounty = useCallback(
    (name: string) => {
      clearErrors(["installCounty", "installTown", "installLandmark"]);
      setValue("installCounty", name, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setCountyModal(false);
    },
    [setValue, clearErrors]
  );

  return (
    <View style={registerStyles.form}>
      <Text style={{ marginBottom: 18, fontSize: 13, color: "#666666" }}>
        Where should the service be installed? Choose county, then enter town
        and a nearby landmark.
      </Text>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>County</Text>
        <Controller
          control={control}
          name="installCounty"
          render={({ field: { value }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                ]}
                onPress={() => setCountyModal(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {value || "Select county"}
                </Text>
              </TouchableOpacity>
              {error ? (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              ) : null}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Installation town</Text>
        <Controller
          control={control}
          name="installTown"
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
                placeholder="e.g. Westlands, Rongai, Kisumu CBD"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={(t) => {
                  clearErrors(["installTown"]);
                  onChange(t);
                }}
                onBlur={onBlur}
                autoCapitalize="words"
              />
              {error ? (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              ) : null}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Landmark</Text>
        <Controller
          control={control}
          name="installLandmark"
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
                placeholder="e.g. Near Naivas, opposite school gate"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={(t) => {
                  clearErrors(["installLandmark"]);
                  onChange(t);
                }}
                onBlur={onBlur}
                autoCapitalize="sentences"
              />
              {error ? (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              ) : null}
            </>
          )}
        />
      </View>

      <Modal visible={countyModal} transparent animationType="slide">
        <Pressable
          style={modalStyles.modalOverlay}
          onPress={() => setCountyModal(false)}
        >
          <View
            style={[modalStyles.modalContent, { maxHeight: "80%" }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Select county</Text>
              <TouchableOpacity onPress={() => setCountyModal(false)}>
                <Text style={modalStyles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[...KENYAN_COUNTIES]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.modalItem}
                  onPress={() => onPickCounty(item)}
                >
                  <Text style={modalStyles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
