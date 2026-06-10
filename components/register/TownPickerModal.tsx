import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  Dimensions,
} from "react-native";
import { KENYAN_TOWNS } from "@/constants/kenyanTowns";
import { modalStyles } from "./styles";

interface TownPickerModalProps {
  visible: boolean;
  selectedTown: string;
  onClose: () => void;
  onSelectTown: (town: string) => void;
  /** When set, only these towns are shown (e.g. Home Fiber coverage). Defaults to all Kenyan towns. */
  towns?: readonly string[];
  modalTitle?: string;
  modalSubtitle?: string;
}

export default function TownPickerModal({
  visible,
  selectedTown,
  onClose,
  onSelectTown,
  towns = KENYAN_TOWNS,
  modalTitle = "Select town",
  modalSubtitle = "Choose your location",
}: TownPickerModalProps) {
  const [townSearchQuery, setTownSearchQuery] = useState("");

  const { height: screenHeight } = Dimensions.get("window");
  const modalHeight = screenHeight * 0.85;
  const modalListHeight = modalHeight - 170;

  const filteredTowns = towns.filter((town) =>
    town.toLowerCase().includes(townSearchQuery.toLowerCase())
  );

  const handleSelectTown = (town: string) => {
    onSelectTown(town);
    Keyboard.dismiss();
    onClose();
    setTownSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setTownSearchQuery("");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={modalStyles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View
          style={[modalStyles.modalContent, { height: modalHeight }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Modal Header */}
          <View style={modalStyles.modalHeader}>
            <View style={modalStyles.modalHeaderLeft}>
              <View style={modalStyles.modalIconContainer}>
                <Text style={modalStyles.modalIcon}>📍</Text>
              </View>
              <View>
                <Text style={modalStyles.modalTitle}>{modalTitle}</Text>
                <Text style={modalStyles.modalSubtitle}>{modalSubtitle}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={modalStyles.modalCloseButton}
              activeOpacity={0.7}
            >
              <View style={modalStyles.modalCloseButtonInner}>
                <Text style={modalStyles.modalCloseText}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={modalStyles.modalSearchContainer}>
            <View style={modalStyles.modalSearchBox}>
              <Text style={modalStyles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={modalStyles.modalSearchInput}
                placeholder="Search towns..."
                placeholderTextColor="#999999"
                value={townSearchQuery}
                onChangeText={setTownSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {townSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setTownSearchQuery("")}
                  style={modalStyles.modalSearchClear}
                  activeOpacity={0.7}
                >
                  <Text style={modalStyles.modalSearchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Town List */}
          <View style={[modalStyles.modalListContainer, { height: modalListHeight }]}>
            <FlatList
              data={filteredTowns}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedTown === item;
                return (
                  <TouchableOpacity
                    style={[
                      modalStyles.modalItem,
                      isSelected && modalStyles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectTown(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        modalStyles.modalItemText,
                        isSelected && modalStyles.modalItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={modalStyles.modalItemCheck}>
                        <Text style={modalStyles.modalItemCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              style={modalStyles.modalList}
              contentContainerStyle={modalStyles.modalListContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={modalStyles.modalEmpty}>
                  <Text style={modalStyles.modalEmptyIcon}>🔍</Text>
                  <Text style={modalStyles.modalEmptyText}>
                    No towns found matching "{townSearchQuery}"
                  </Text>
                  <TouchableOpacity
                    onPress={() => setTownSearchQuery("")}
                    style={modalStyles.modalEmptyButton}
                    activeOpacity={0.7}
                  >
                    <Text style={modalStyles.modalEmptyButtonText}>Clear search</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

