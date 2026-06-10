import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
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
  useWatch,
} from "react-hook-form";
import { SAFARICOM_REGION_CLUSTERS } from "../../constants/safaricomRegions";
import type { SafaricomRegistrationFormData } from "../../lib/validation/safaricomRegistrationSchemas";
import {
  fetchEstatesByRegionCluster,
  type SafaricomEstateRow,
} from "../../lib/services/safaricomEstatesApi";
import { modalStyles, registerStyles } from "../register/styles";
import { scaleFont, scaleHeight, scaleWidth } from "../../lib/utils/responsive";

const SAF_GREEN = "#00A651";

type Props = {
  control: Control<SafaricomRegistrationFormData>;
  setValue: UseFormSetValue<SafaricomRegistrationFormData>;
  clearErrors: UseFormClearErrors<SafaricomRegistrationFormData>;
};

export default function SafaricomFiberLocationStep({
  control,
  setValue,
  clearErrors,
}: Props) {
  const [regionModal, setRegionModal] = useState(false);
  const [installationLocationModal, setInstallationLocationModal] =
    useState(false);
  const [isCustomClusterMode, setIsCustomClusterMode] = useState(false);
  const [customClusterText, setCustomClusterText] = useState("");
  const [isCustomEstateMode, setIsCustomEstateMode] = useState(false);
  const [customEstateText, setCustomEstateText] = useState("");
  const [estateModal, setEstateModal] = useState(false);
  const [estateSearch, setEstateSearch] = useState("");
  const [estates, setEstates] = useState<SafaricomEstateRow[]>([]);
  const [loadingEstates, setLoadingEstates] = useState(false);
  const [estateLoadError, setEstateLoadError] = useState<string | null>(null);
  const fetchSeq = useRef(0);

  const regionName = useWatch({ control, name: "fiberRegionName" }) ?? "";
  const clusterName = useWatch({ control, name: "fiberClusterName" }) ?? "";
  const estateId = useWatch({ control, name: "fiberEstateId" }) ?? "";
  const estateDisplayName = useWatch({ control, name: "fiberEstateName" }) ?? "";
  const hasCustomInstallationLocation = customClusterText.trim().length > 0;

  const clustersForRegion = useMemo(() => {
    const g = SAFARICOM_REGION_CLUSTERS.find((r) => r.region_name === regionName);
    return g?.clusters ?? [];
  }, [regionName]);

  useEffect(() => {
    setIsCustomClusterMode(false);
    setCustomClusterText("");
    setIsCustomEstateMode(false);
    setCustomEstateText("");
  }, [regionName]);

  const filteredEstates = useMemo(() => {
    const q = estateSearch.trim().toLowerCase();
    if (!q) return estates;
    return estates.filter((e) =>
      e.estate_name.toLowerCase().includes(q)
    );
  }, [estates, estateSearch]);

  /** Load buildings only when the building modal is open (loading/error stay in the modal). */
  useEffect(() => {
    if (!estateModal || !regionName.trim() || !clusterName.trim()) {
      if (!estateModal) {
        setLoadingEstates(false);
      }
      return;
    }
    const seq = ++fetchSeq.current;
    let cancelled = false;
    setLoadingEstates(true);
    setEstateLoadError(null);
    fetchEstatesByRegionCluster(regionName, clusterName)
      .then((rows) => {
        if (cancelled || seq !== fetchSeq.current) return;
        setEstates(rows);
      })
      .catch((e: Error) => {
        if (cancelled || seq !== fetchSeq.current) return;
        setEstates([]);
        setEstateLoadError(e.message || "Could not load buildings");
      })
      .finally(() => {
        if (cancelled || seq !== fetchSeq.current) return;
        setLoadingEstates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [estateModal, regionName, clusterName]);

  const clearBuilding = useCallback(() => {
    setValue("fiberEstateId", "", { shouldDirty: true, shouldValidate: false });
    setValue("fiberEstateName", "", { shouldDirty: true, shouldValidate: false });
  }, [setValue]);

  const onPickRegion = useCallback(
    (name: string) => {
      setEstates([]);
      setEstateLoadError(null);
      clearErrors([
        "fiberRegionName",
        "fiberClusterName",
        "fiberEstateId",
        "fiberEstateName",
      ]);
      setValue("fiberRegionName", name, { shouldDirty: true, shouldValidate: false });
      setValue("fiberClusterName", "", { shouldDirty: true, shouldValidate: false });
      setIsCustomEstateMode(false);
      setCustomEstateText("");
      clearBuilding();
      setRegionModal(false);
    },
    [setValue, clearBuilding, clearErrors]
  );

  const onPickInstallationLocation = useCallback(
    (name: string) => {
      setEstates([]);
      setEstateLoadError(null);
      clearErrors(["fiberClusterName", "fiberEstateId", "fiberEstateName"]);
      setIsCustomClusterMode(false);
      setCustomClusterText("");
      setIsCustomEstateMode(false);
      setCustomEstateText("");
      setValue("fiberClusterName", name, { shouldDirty: true, shouldValidate: false });
      clearBuilding();
      setInstallationLocationModal(false);
    },
    [setValue, clearBuilding, clearErrors]
  );

  const onPickEstate = useCallback(
    (row: SafaricomEstateRow) => {
      clearErrors(["fiberEstateId", "fiberEstateName"]);
      setValue("fiberEstateId", String(row.estate_id), {
        shouldDirty: true,
        shouldValidate: false,
      });
      setValue("fiberEstateName", row.estate_name, {
        shouldDirty: true,
        shouldValidate: false,
      });
      setIsCustomEstateMode(false);
      setCustomEstateText("");
      setEstateModal(false);
      setEstateSearch("");
    },
    [setValue, clearErrors]
  );

  return (
    <View style={registerStyles.form}>
      <Text style={styles.intro}>
        Choose the exact region and installation location from the list, then pick
        the building from Safaricom's list.
      </Text>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Region</Text>
        <Controller
          control={control}
          name="fiberRegionName"
          render={({ field: { value }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                ]}
                onPress={() => setRegionModal(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {value || "Select region"}
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
        <Text style={registerStyles.label}>Installation location</Text>
        <Controller
          control={control}
          name="fiberClusterName"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                  !regionName || isCustomClusterMode ? { opacity: 0.45 } : null,
                ]}
                disabled={!regionName || isCustomClusterMode}
                onPress={() =>
                  regionName && setInstallationLocationModal(true)
                }
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {!regionName
                    ? "Select a region first"
                    : isCustomClusterMode
                    ? customClusterText || "Custom installation location"
                    : value || "Select installation location"}
                </Text>
              </TouchableOpacity>
              {isCustomClusterMode ? (
                <>
                  <TextInput
                    style={[
                      registerStyles.input,
                      { marginTop: scaleHeight(10) },
                      error && registerStyles.inputError,
                    ]}
                    placeholder="Enter custom installation location"
                    placeholderTextColor="#999999"
                    value={customClusterText}
                    onChangeText={(text) => {
                      setCustomClusterText(text);
                      onChange(text);
                      clearBuilding();
                      clearErrors(["fiberClusterName", "fiberEstateId", "fiberEstateName"]);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setIsCustomClusterMode(false);
                      setCustomClusterText("");
                      setIsCustomEstateMode(false);
                      setCustomEstateText("");
                      onChange("");
                      clearBuilding();
                    }}
                    activeOpacity={0.7}
                    style={{ marginTop: scaleHeight(8), alignSelf: "flex-start" }}
                  >
                    <Text style={styles.inlineAction}>Choose from list instead</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {error ? (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              ) : null}
            </>
          )}
        />
      </View>

      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Building / estate</Text>
        <Controller
          control={control}
          name="fiberEstateId"
          render={({ fieldState: { error } }) => (
            <>
              {isCustomClusterMode || isCustomEstateMode ? (
                <TextInput
                  style={[
                    registerStyles.input,
                    error && registerStyles.inputError,
                    isCustomClusterMode && !hasCustomInstallationLocation
                      ? { opacity: 0.45 }
                      : null,
                  ]}
                  editable={isCustomClusterMode ? hasCustomInstallationLocation : true}
                  placeholder={
                    isCustomClusterMode && !hasCustomInstallationLocation
                      ? "Enter installation location first"
                      : "Enter building / estate"
                  }
                  placeholderTextColor="#999999"
                  value={
                    isCustomEstateMode
                      ? customEstateText
                      : estateDisplayName === "Custom location"
                      ? ""
                      : estateDisplayName
                  }
                  onChangeText={(text) => {
                    if (isCustomEstateMode) {
                      setCustomEstateText(text);
                    }
                    setValue("fiberEstateName", text, {
                      shouldDirty: true,
                      shouldValidate: false,
                    });
                    setValue("fiberEstateId", text.trim() ? "0" : "", {
                      shouldDirty: true,
                      shouldValidate: false,
                    });
                    clearErrors(["fiberEstateId", "fiberEstateName"]);
                  }}
                />
              ) : (
                <TouchableOpacity
                  style={[
                    registerStyles.input,
                    error && registerStyles.inputError,
                    { justifyContent: "center" },
                    !regionName || !clusterName ? { opacity: 0.45 } : null,
                  ]}
                  disabled={!regionName || !clusterName}
                  onPress={() => {
                    if (!regionName || !clusterName) return;
                    setEstateSearch("");
                    setEstateModal(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      color: estateDisplayName ? "#333333" : "#999999",
                      fontFamily: "Inter_400Regular",
                    }}
                    numberOfLines={2}
                  >
                    {!regionName || !clusterName
                      ? "Select region and installation location first"
                      : estateDisplayName || "Select building"}
                  </Text>
                </TouchableOpacity>
              )}
              {isCustomEstateMode ? (
                <TouchableOpacity
                  onPress={() => {
                    setIsCustomEstateMode(false);
                    setCustomEstateText("");
                    clearBuilding();
                  }}
                  activeOpacity={0.7}
                  style={{ marginTop: scaleHeight(8), alignSelf: "flex-start" }}
                >
                  <Text style={styles.inlineAction}>Choose from list instead</Text>
                </TouchableOpacity>
              ) : null}
              {error ? (
                <Text style={registerStyles.errorText}>{error.message}</Text>
              ) : null}
            </>
          )}
        />
      </View>

      <Modal visible={regionModal} transparent animationType="slide">
        <Pressable style={modalStyles.modalOverlay} onPress={() => setRegionModal(false)}>
          <View
            style={[modalStyles.modalContent, { maxHeight: "80%" }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Select region</Text>
              <TouchableOpacity onPress={() => setRegionModal(false)}>
                <Text style={modalStyles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SAFARICOM_REGION_CLUSTERS}
              keyExtractor={(item) => item.region_name}
              contentContainerStyle={{ paddingBottom: scaleHeight(16) }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.modalItem}
                  onPress={() => onPickRegion(item.region_name)}
                >
                  <Text style={modalStyles.modalItemText}>{item.region_name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={installationLocationModal}
        transparent
        animationType="slide"
      >
        <Pressable
          style={modalStyles.modalOverlay}
          onPress={() => setInstallationLocationModal(false)}
        >
          <View
            style={[modalStyles.modalContent, { maxHeight: "80%" }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>
                Select installation location
              </Text>
              <TouchableOpacity
                onPress={() => setInstallationLocationModal(false)}
              >
                <Text style={modalStyles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={clustersForRegion}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingBottom: scaleHeight(16) }}
              ListFooterComponent={
                <TouchableOpacity
                  style={modalStyles.modalItem}
                  onPress={() => {
                    setInstallationLocationModal(false);
                    setIsCustomClusterMode(true);
                    setCustomClusterText("");
                    setIsCustomEstateMode(false);
                    setCustomEstateText("");
                    setValue("fiberClusterName", "", {
                      shouldDirty: true,
                      shouldValidate: false,
                    });
                    clearBuilding();
                  }}
                >
                  <Text style={styles.otherActionText}>Other (Enter custom location)</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.modalItem}
                  onPress={() => onPickInstallationLocation(item)}
                >
                  <Text style={modalStyles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={estateModal} transparent animationType="slide">
        <Pressable style={modalStyles.modalOverlay} onPress={() => setEstateModal(false)}>
          <View
            style={[modalStyles.modalContent, { maxHeight: "85%" }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={modalStyles.modalHeader}>
              <View>
                <Text style={modalStyles.modalTitle}>Select building</Text>
                <Text style={modalStyles.modalSubtitle}>
                  {regionName}
                  {clusterName ? ` · ${clusterName}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEstateModal(false)}>
                <Text style={modalStyles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={modalStyles.modalSearchContainer}>
              <View style={modalStyles.modalSearchBox}>
                <Text style={modalStyles.modalSearchIcon}>🔍</Text>
                <TextInput
                  style={modalStyles.modalSearchInput}
                  placeholder="Search by building name"
                  placeholderTextColor="#999999"
                  value={estateSearch}
                  onChangeText={setEstateSearch}
                />
              </View>
            </View>
            {loadingEstates ? (
              <View style={styles.centerPad}>
                <ActivityIndicator size="large" color={SAF_GREEN} />
                <Text style={styles.modalLoadingText}>Loading buildings…</Text>
              </View>
            ) : estateLoadError ? (
              <View style={[modalStyles.modalEmpty, styles.centerPad]}>
                <Text style={modalStyles.modalEmptyText}>{estateLoadError}</Text>
                <Text style={styles.modalHintText}>
                  Check region and installation location, then try again.
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredEstates}
                keyExtractor={(item) => String(item.estate_id)}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListFooterComponent={
                  <TouchableOpacity
                    style={modalStyles.modalItem}
                    onPress={() => {
                      setEstateModal(false);
                      setIsCustomEstateMode(true);
                      setCustomEstateText("");
                      clearBuilding();
                    }}
                  >
                    <Text style={styles.otherActionText}>
                      Other (Enter custom building / estate)
                    </Text>
                  </TouchableOpacity>
                }
                ListEmptyComponent={
                  <View style={modalStyles.modalEmpty}>
                    <Text style={modalStyles.modalEmptyText}>
                      No buildings returned for this region and installation
                      location.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalStyles.modalItem}
                    onPress={() => onPickEstate(item)}
                  >
                    <View>
                      <Text style={modalStyles.modalItemText}>{item.estate_name}</Text>
                      <Text style={styles.estateMeta}>ID {item.estate_id}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: scaleFont(19),
    marginBottom: scaleHeight(18),
  },
  modalLoadingText: {
    marginTop: scaleHeight(14),
    fontSize: scaleFont(14),
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  modalHintText: {
    marginTop: scaleHeight(10),
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    paddingHorizontal: scaleWidth(16),
  },
  centerPad: {
    paddingVertical: scaleHeight(40),
    alignItems: "center",
  },
  estateMeta: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginTop: 4,
  },
  otherActionText: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  inlineAction: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
});
