import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  type LayoutChangeEvent,
} from "react-native";
import {
  Control,
  Controller,
  UseFormClearErrors,
  UseFormSetValue,
  useFormState,
  useWatch,
} from "react-hook-form";
import {
  SAFARICOM_PACKAGE_IDS,
  type SafaricomServicePackage,
} from "../../constants/safaricomServiceAreas";
import { HOME_BUSINESS_FIBER_DEALS } from "../../constants/safaricomFiberDeals";
import { SAFARICOM_DEDICATED_WIFI_DEALS } from "../../constants/safaricomDedicatedWifiDeals";
import {
  PORTABLE_5G_DEVICE_PRICE_LABEL,
  SAFARICOM_PORTABLE_5G_DEALS,
} from "../../constants/safaricomPortable5gDeals";
import type { SafaricomRegistrationFormData } from "../../lib/validation/safaricomRegistrationSchemas";
import { registerStyles } from "../register/styles";
import { scaleFont, scaleHeight, scaleWidth } from "../../lib/utils/responsive";

type Props = {
  control: Control<SafaricomRegistrationFormData>;
  setValue: UseFormSetValue<SafaricomRegistrationFormData>;
  clearErrors: UseFormClearErrors<SafaricomRegistrationFormData>;
};

const SAF_GREEN = "#00A651";

const PACKAGE_COPY: Record<
  SafaricomServicePackage,
  { title: string; line: string }
> = {
  home_business_fiber: {
    title: "Home and Business Fiber",
    line: "Fixed-line fibre for home or office.",
  },
  safaricom_portable_5g: {
    title: "Safaricom portable 5G",
    line: "5G you can move with you.",
  },
  safaricom_dedicated_wifi: {
    title: "Safaricom dedicated wifi",
    line: "Dedicated wireless for a site or business.",
  },
};

const SLIDE_MS = 320;

const STEP1_ERROR_FIELDS: (keyof SafaricomRegistrationFormData)[] = [
  "servicePackage",
  "fiberDealId",
  "portableDealId",
  "dedicatedWifiDealId",
];

export default function SafaricomPackageLocationStep({
  control,
  setValue,
  clearErrors,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const slideWidthRef = useRef(
    Math.max(280, Dimensions.get("window").width - 40)
  );
  const openWhenSized = useRef(false);
  const [slideW, setSlideW] = useState(slideWidthRef.current);

  const servicePackage = useWatch({
    control,
    name: "servicePackage",
  }) as SafaricomServicePackage | undefined;
  const fiberDealId = useWatch({ control, name: "fiberDealId" }) as
    | string
    | undefined;
  const portableDealId = useWatch({ control, name: "portableDealId" }) as
    | string
    | undefined;
  const dedicatedWifiDealId = useWatch({
    control,
    name: "dedicatedWifiDealId",
  }) as string | undefined;

  const { errors } = useFormState({ control });

  const animateTo = useCallback(
    (offset: number) => {
      Animated.timing(translateX, {
        toValue: offset,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [translateX]
  );

  const openDealsPanel = useCallback(() => {
    const w = slideWidthRef.current;
    if (w > 0) {
      animateTo(-w);
    } else {
      openWhenSized.current = true;
    }
  }, [animateTo]);

  const onSliderLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      slideWidthRef.current = w;
      setSlideW(w);
      if (openWhenSized.current && w > 0) {
        openWhenSized.current = false;
        animateTo(-w);
      }
    },
    [animateTo]
  );

  const closeDealsPanel = useCallback(() => {
    clearErrors(STEP1_ERROR_FIELDS);
    const w = slideWidthRef.current;
    const clearSelection = () => {
      const resetOpts = { shouldDirty: true, shouldValidate: false } as const;
      setValue("servicePackage", undefined as never, resetOpts);
      setValue("fiberDealId", undefined, resetOpts);
      setValue("portableDealId", undefined, resetOpts);
      setValue("dedicatedWifiDealId", undefined, resetOpts);
    };
    if (w <= 0) {
      translateX.setValue(0);
      clearSelection();
      return;
    }
    Animated.timing(translateX, {
      toValue: 0,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        clearSelection();
      }
    });
  }, [clearErrors, setValue, translateX]);

  const onSelectPackageType = (pkg: SafaricomServicePackage) => {
    setValue("fiberDealId", undefined, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("portableDealId", undefined, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("dedicatedWifiDealId", undefined, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("servicePackage", pkg, {
      shouldDirty: true,
      shouldValidate: true,
    });
    openDealsPanel();
  };

  const onSelectFiberDeal = (id: string) => {
    setValue("fiberDealId", id, { shouldDirty: true, shouldValidate: true });
  };

  const onSelectPortableDeal = (id: string) => {
    setValue("portableDealId", id, { shouldDirty: true, shouldValidate: true });
  };

  const onSelectDedicatedWifiDeal = (id: string) => {
    setValue("dedicatedWifiDealId", id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const rowWidth = slideW * 2;

  return (
    <View style={registerStyles.form}>
      <View style={styles.sliderClip} onLayout={onSliderLayout}>
        <Animated.View
          style={[
            styles.sliderRow,
            { width: rowWidth, transform: [{ translateX }] },
          ]}
        >
          {/* Panel A — package types */}
          <View style={{ width: slideW }}>
            <Controller
              control={control}
              name="servicePackage"
              render={({ field: { value }, fieldState: { error } }) => (
                <>
                  <View style={styles.cardList}>
                    {SAFARICOM_PACKAGE_IDS.map((pkg) => {
                      const selected =
                        typeof value === "string" &&
                        value.length > 0 &&
                        value === pkg;
                      const copy = PACKAGE_COPY[pkg];
                      return (
                        <TouchableOpacity
                          key={pkg}
                          style={[styles.card, selected && styles.cardSelected]}
                          onPress={() => onSelectPackageType(pkg)}
                          activeOpacity={0.85}
                        >
                          <View
                            style={[
                              styles.accent,
                              selected && styles.accentSelected,
                            ]}
                          />
                          <View style={styles.cardBody}>
                            <Text
                              style={[
                                styles.title,
                                selected && styles.titleSelected,
                              ]}
                            >
                              {copy.title}
                            </Text>
                            <Text
                              style={[
                                styles.line,
                                selected && styles.lineSelected,
                              ]}
                            >
                              {copy.line}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {error ? (
                    <Text style={[registerStyles.errorText, styles.errorBelow]}>
                      {error.message}
                    </Text>
                  ) : null}
                </>
              )}
            />
          </View>

          {/* Panel B — fibre plans or placeholder */}
          <View style={{ width: slideW }}>
            {servicePackage === "home_business_fiber" ? (
              <View style={styles.dealsPanel}>
                <TouchableOpacity
                  onPress={closeDealsPanel}
                  style={styles.backRow}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backChevron}>‹</Text>
                  <Text style={styles.backLabel}>Packages</Text>
                </TouchableOpacity>
                <Text style={styles.dealsHeading}>Home & Business Fibre</Text>
                <Text style={styles.dealsSub}>Select a speed</Text>
                <View style={styles.dealList}>
                  {HOME_BUSINESS_FIBER_DEALS.map((deal) => {
                    const selected = fiberDealId === deal.id;
                    return (
                      <TouchableOpacity
                        key={deal.id}
                        style={[styles.dealCard, selected && styles.dealCardOn]}
                        onPress={() => onSelectFiberDeal(deal.id)}
                        activeOpacity={0.88}
                      >
                        <View
                          style={[
                            styles.dealAccent,
                            selected && styles.dealAccentOn,
                          ]}
                        />
                        <View style={styles.dealBody}>
                          <Text
                            style={[
                              styles.dealSpeed,
                              selected && styles.dealSpeedOn,
                            ]}
                          >
                            {deal.speedLabel}
                          </Text>
                          <Text
                            style={[
                              styles.dealPrice,
                              selected && styles.dealPriceOn,
                            ]}
                          >
                            {deal.priceLabel}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.fiberDealId?.message ? (
                  <Text style={[registerStyles.errorText, styles.errorBelow]}>
                    {errors.fiberDealId.message}
                  </Text>
                ) : null}
              </View>
            ) : servicePackage === "safaricom_portable_5g" ? (
              <View style={styles.dealsPanel}>
                <TouchableOpacity
                  onPress={closeDealsPanel}
                  style={styles.backRow}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backChevron}>‹</Text>
                  <Text style={styles.backLabel}>Packages</Text>
                </TouchableOpacity>
                <Text style={styles.dealsHeading}>Portable 5G</Text>
                <View style={styles.deviceBanner}>
                  <Text style={styles.deviceBannerLabel}>Device price</Text>
                  <Text style={styles.deviceBannerPrice}>
                    {PORTABLE_5G_DEVICE_PRICE_LABEL}
                  </Text>
                </View>
                <Text style={styles.dealsSub}>Select a plan</Text>
                <View style={styles.dealList}>
                  {SAFARICOM_PORTABLE_5G_DEALS.map((deal) => {
                    const selected = portableDealId === deal.id;
                    return (
                      <TouchableOpacity
                        key={deal.id}
                        style={[styles.dealCard, selected && styles.dealCardOn]}
                        onPress={() => onSelectPortableDeal(deal.id)}
                        activeOpacity={0.88}
                      >
                        <View
                          style={[
                            styles.dealAccent,
                            selected && styles.dealAccentOn,
                          ]}
                        />
                        <View style={styles.dealBody}>
                          <Text
                            style={[
                              styles.dealSpeed,
                              selected && styles.dealSpeedOn,
                            ]}
                          >
                            {deal.speedLabel}
                          </Text>
                          <Text
                            style={[
                              styles.dealPrice,
                              selected && styles.dealPriceOn,
                            ]}
                          >
                            {deal.priceLabel}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.portableDealId?.message ? (
                  <Text style={[registerStyles.errorText, styles.errorBelow]}>
                    {errors.portableDealId.message}
                  </Text>
                ) : null}
              </View>
            ) : servicePackage === "safaricom_dedicated_wifi" ? (
              <View style={styles.dealsPanel}>
                <TouchableOpacity
                  onPress={closeDealsPanel}
                  style={styles.backRow}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backChevron}>‹</Text>
                  <Text style={styles.backLabel}>Packages</Text>
                </TouchableOpacity>
                <Text style={styles.dealsHeading}>Dedicated WiFi</Text>
                <Text style={styles.dealsSub}>Select a plan</Text>
                <View style={styles.dealList}>
                  {SAFARICOM_DEDICATED_WIFI_DEALS.map((deal) => {
                    const selected = dedicatedWifiDealId === deal.id;
                    return (
                      <TouchableOpacity
                        key={deal.id}
                        style={[styles.dealCard, selected && styles.dealCardOn]}
                        onPress={() => onSelectDedicatedWifiDeal(deal.id)}
                        activeOpacity={0.88}
                      >
                        <View
                          style={[
                            styles.dealAccent,
                            selected && styles.dealAccentOn,
                          ]}
                        />
                        <View style={styles.dealBody}>
                          <Text
                            style={[
                              styles.dealSpeed,
                              selected && styles.dealSpeedOn,
                            ]}
                          >
                            {deal.speedLabel}
                          </Text>
                          <Text
                            style={[
                              styles.dealPrice,
                              selected && styles.dealPriceOn,
                            ]}
                          >
                            {deal.priceLabel}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.dedicatedWifiDealId?.message ? (
                  <Text style={[registerStyles.errorText, styles.errorBelow]}>
                    {errors.dedicatedWifiDealId.message}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.dealsPanel}>
                <TouchableOpacity
                  onPress={closeDealsPanel}
                  style={styles.backRow}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backChevron}>‹</Text>
                  <Text style={styles.backLabel}>Packages</Text>
                </TouchableOpacity>
                <Text style={styles.placeholderTitle}>Plans coming soon</Text>
                <Text style={styles.placeholderBody}>
                  Speed options for this product will appear here next.
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderClip: {
    overflow: "hidden",
    width: "100%",
  },
  sliderRow: {
    flexDirection: "row",
  },
  cardList: {
    gap: scaleHeight(10),
  },
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(14),
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSelected: {
    borderColor: SAF_GREEN,
    backgroundColor: "#F3FBF6",
    shadowColor: SAF_GREEN,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  accent: {
    width: scaleWidth(4),
    backgroundColor: "#E0E0E0",
  },
  accentSelected: {
    backgroundColor: SAF_GREEN,
  },
  cardBody: {
    flex: 1,
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(14),
    paddingLeft: scaleWidth(12),
  },
  title: {
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    letterSpacing: 0.2,
    marginBottom: scaleHeight(4),
  },
  titleSelected: {
    color: "#0D4D2B",
  },
  line: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: scaleFont(18),
  },
  lineSelected: {
    color: "#3D6B52",
  },
  dealsPanel: {
    flex: 1,
    paddingLeft: scaleWidth(4),
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(14),
    alignSelf: "flex-start",
  },
  backChevron: {
    fontSize: scaleFont(28),
    color: SAF_GREEN,
    marginRight: 2,
    marginTop: -2,
    fontFamily: "Inter_400Regular",
  },
  backLabel: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
    color: SAF_GREEN,
  },
  dealsHeading: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: scaleHeight(4),
  },
  dealsSub: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#888888",
    marginBottom: scaleHeight(14),
  },
  deviceBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F7F3",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(14),
    marginBottom: scaleHeight(14),
    borderWidth: 1,
    borderColor: "rgba(0, 166, 81, 0.22)",
  },
  deviceBannerLabel: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#555555",
  },
  deviceBannerPrice: {
    fontSize: scaleFont(17),
    fontFamily: "Poppins_600SemiBold",
    color: SAF_GREEN,
  },
  dealList: {
    gap: scaleHeight(8),
  },
  dealCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(12),
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    overflow: "hidden",
  },
  dealCardOn: {
    borderColor: SAF_GREEN,
    backgroundColor: "#F3FBF6",
  },
  dealAccent: {
    width: scaleWidth(4),
    backgroundColor: "#DDDDDD",
  },
  dealAccentOn: {
    backgroundColor: SAF_GREEN,
  },
  dealBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(14),
  },
  dealSpeed: {
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
    color: "#222222",
  },
  dealSpeedOn: {
    color: "#0D4D2B",
  },
  dealPrice: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_600SemiBold",
    color: SAF_GREEN,
  },
  dealPriceOn: {
    color: "#008045",
  },
  placeholderTitle: {
    fontSize: scaleFont(17),
    fontFamily: "Poppins_600SemiBold",
    color: "#444444",
    marginBottom: scaleHeight(8),
  },
  placeholderBody: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_400Regular",
    color: "#777777",
    lineHeight: scaleFont(20),
  },
  errorBelow: {
    marginTop: scaleHeight(12),
  },
});
