import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { usePlacesSearch } from "../lib/google-places/usePlacesSearch";
import type { SelectedGooglePlace } from "../lib/google-places/types";
import { scaleFont, scaleHeight } from "../lib/utils/responsive";

type PlacesLocationSearchProps = {
  selected: SelectedGooglePlace | null;
  onSelect: (place: SelectedGooglePlace | null) => void;
  error?: string;
  placeholder?: string;
  onMenuOpenChange?: (open: boolean) => void;
  onFocusSearch?: () => void;
};

export function PlacesLocationSearch({
  selected,
  onSelect,
  error,
  placeholder = "Search a shop, church, or building",
  onMenuOpenChange,
  onFocusSearch,
}: PlacesLocationSearchProps) {
  const inputRef = useRef<TextInput>(null);
  const {
    query,
    predictions,
    status,
    loading,
    handleChange,
    selectPrediction,
  } = usePlacesSearch(selected, onSelect);

  const showMenu = predictions.length > 0 || Boolean(status);
  const showError = Boolean(error);
  const menuMaxHeight = scaleHeight(220);

  useEffect(() => {
    onMenuOpenChange?.(showMenu);
  }, [showMenu, onMenuOpenChange]);

  const onPickSuggestion = (item: Parameters<typeof selectPrediction>[0]) => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    void selectPrediction(item);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputWrap, showError && styles.inputWrapError]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          onFocus={() => onFocusSearch?.()}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#0066CC"
            style={styles.trailing}
          />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={() => handleChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.trailing}
          >
            <MaterialIcons name="close" size={18} color="#999999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {showMenu ? (
        <View style={[styles.menu, styles.menuBelow]}>
          {status && predictions.length === 0 && !loading ? (
            <Text style={styles.status}>{status}</Text>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              style={{ maxHeight: menuMaxHeight }}
              showsVerticalScrollIndicator={predictions.length > 4}
            >
              {predictions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.row}
                  onPress={() => onPickSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.secondary ? (
                    <Text style={styles.rowSecondary} numberOfLines={1}>
                      {item.secondary}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 20,
    elevation: 20,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapError: {
    borderColor: "#FF3B30",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
  },
  trailing: {
    marginRight: 12,
  },
  menu: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    maxHeight: scaleHeight(220),
    zIndex: 30,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuBelow: {
    marginTop: 8,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
  },
  rowLabel: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
    color: "#333333",
  },
  rowSecondary: {
    marginTop: 2,
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  status: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FF3B30",
    marginTop: 4,
  },
});
