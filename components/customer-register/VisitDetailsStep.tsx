import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Controller, Control } from "react-hook-form";
import { CustomerRegistrationFormData } from "@/lib/validation/customerRegistrationSchemas";
import { registerStyles } from "../register/styles";
import { useState } from "react";

interface VisitDetailsStepProps {
  control: Control<CustomerRegistrationFormData>;
}

// Available visit time slots
const VISIT_TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
];

// Format date to M/d/yyyy
const formatDate = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Parse date string (M/d/yyyy) to Date object
const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
};

// Get days in a month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// Get first day of month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export default function VisitDetailsStep({ control }: VisitDetailsStepProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderCalendar = () => {
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View 
          key={`empty-${i}`} 
          style={{ 
            flex: 1,
            aspectRatio: 1,
            maxWidth: "14.28%",
          }} 
        />
      );
    }

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isPast = date < today;
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear;

      days.push(
        <TouchableOpacity
          key={day}
          style={{
            flex: 1,
            aspectRatio: 1,
            maxWidth: "14.28%",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isSelected ? "#0066CC" : "transparent",
            borderRadius: 20,
            marginHorizontal: 2,
            marginVertical: 2,
          }}
          onPress={() => {
            if (!isPast) {
              setSelectedDate(date);
            }
          }}
          disabled={isPast}
        >
          <Text
            style={{
              fontSize: 14,
              fontFamily: isSelected ? "Poppins_600SemiBold" : "Inter_400Regular",
              color: isPast ? "#CCCCCC" : isSelected ? "#FFFFFF" : "#333333",
            }}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    // Group days into weeks (rows of 7)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <View style={{ width: "100%" }}>
        {/* Day names header */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 8,
            width: "100%",
          }}
        >
          {dayNames.map((day) => (
            <View
              key={day}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: "#666666",
                }}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>
        {/* Calendar days grid - render week by week */}
        {weeks.map((week, weekIndex) => (
          <View
            key={weekIndex}
            style={{
              flexDirection: "row",
              width: "100%",
              marginBottom: 4,
            }}
          >
            {week}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={registerStyles.form}>
      {/* Visit Date Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Visit Date</Text>
        <Controller
          control={control}
          name="visitDate"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                ]}
                onPress={() => {
                  // Initialize selectedDate with current value if exists
                  if (value) {
                    const parsed = parseDate(value);
                    if (parsed) {
                      setSelectedDate(parsed);
                      setCurrentMonth(parsed.getMonth());
                      setCurrentYear(parsed.getFullYear());
                    }
                  }
                  setShowDatePicker(true);
                }}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {value || "Select visit date"}
                </Text>
              </TouchableOpacity>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    justifyContent: "flex-end",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderTopLeftRadius: 20,
                      borderTopRightRadius: 20,
                      maxHeight: "85%",
                      flexDirection: "column",
                    }}
                  >
                    {/* Month/Year Navigation */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingHorizontal: 20,
                        paddingTop: 20,
                        paddingBottom: 16,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (currentMonth === 0) {
                            setCurrentMonth(11);
                            setCurrentYear(currentYear - 1);
                          } else {
                            setCurrentMonth(currentMonth - 1);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 24, color: "#0066CC" }}>←</Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 18,
                          fontFamily: "Poppins_600SemiBold",
                          color: "#333333",
                        }}
                      >
                        {new Date(currentYear, currentMonth).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (currentMonth === 11) {
                            setCurrentMonth(0);
                            setCurrentYear(currentYear + 1);
                          } else {
                            setCurrentMonth(currentMonth + 1);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 24, color: "#0066CC" }}>→</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Calendar - Scrollable if needed */}
                    <ScrollView
                      contentContainerStyle={{ 
                        paddingHorizontal: 16, 
                        paddingBottom: 16,
                        minHeight: 300,
                      }}
                      showsVerticalScrollIndicator={false}
                    >
                      {renderCalendar()}
                    </ScrollView>

                    {/* Action Buttons - Fixed at bottom */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        paddingHorizontal: 20,
                        paddingTop: 12,
                        paddingBottom: 20,
                        borderTopWidth: 1,
                        borderTopColor: "#F0F0F0",
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: "#F0F0F0",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          setShowDatePicker(false);
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            color: "#666666",
                          }}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 10,
                          backgroundColor: "#0066CC",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          if (selectedDate) {
                            onChange(formatDate(selectedDate));
                          }
                          setShowDatePicker(false);
                        }}
                        disabled={!selectedDate}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins_600SemiBold",
                            color: "#FFFFFF",
                            opacity: selectedDate ? 1 : 0.5,
                          }}
                        >
                          Select
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}
        />
      </View>

      {/* Visit Time Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Visit Time</Text>
        <Controller
          control={control}
          name="visitTime"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <TouchableOpacity
                style={[
                  registerStyles.input,
                  error && registerStyles.inputError,
                  { justifyContent: "center" },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text
                  style={{
                    color: value ? "#333333" : "#999999",
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {value || "Select visit time"}
                </Text>
              </TouchableOpacity>
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              
              <Modal
                visible={showTimePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTimePicker(false)}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    justifyContent: "flex-end",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderTopLeftRadius: 20,
                      borderTopRightRadius: 20,
                      padding: 20,
                      maxHeight: "60%",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: "Poppins_600SemiBold",
                        color: "#333333",
                        marginBottom: 16,
                      }}
                    >
                      Select Visit Time
                    </Text>
                    <ScrollView>
                      {VISIT_TIME_SLOTS.map((time) => (
                        <TouchableOpacity
                          key={time}
                          style={{
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            backgroundColor: value === time ? "#E8F0FE" : "transparent",
                            borderWidth: value === time ? 2 : 0,
                            borderColor: "#0066CC",
                            marginBottom: 8,
                          }}
                          onPress={() => {
                            onChange(time);
                            setShowTimePicker(false);
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontFamily:
                                value === time ? "Poppins_600SemiBold" : "Inter_400Regular",
                              color: value === time ? "#0066CC" : "#333333",
                            }}
                          >
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: "#F0F0F0",
                        alignItems: "center",
                        marginTop: 12,
                      }}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#666666",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          )}
        />
      </View>
    </View>
  );
}

