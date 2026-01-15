import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useRef } from "react";
import { Controller, Control } from "react-hook-form";
import { PersonalInfoFormData } from "@/lib/validation/registerSchemas";
import { registerStyles } from "./styles";

interface PersonalInfoStepProps {
  control: Control<PersonalInfoFormData>;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export default function PersonalInfoStep({
  control,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
  scrollViewRef,
}: PersonalInfoStepProps) {
  // Helper function to scroll input into view
  // KeyboardAvoidingView handles most of the work, this is just a gentle nudge if needed
  const scrollToInput = () => {
    // Let KeyboardAvoidingView handle the main adjustment
    // Just ensure we have enough space by scrolling slightly if needed
    if (scrollViewRef?.current) {
      setTimeout(() => {
        // Small incremental scroll to help with visibility
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  };
  return (
    <View style={registerStyles.form}>
      {/* Name Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Full Name</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
            const inputRef = useRef<TextInput>(null);
            return (
              <>
                <TextInput
                  ref={inputRef}
                  style={[registerStyles.input, error && registerStyles.inputError]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999999"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={scrollToInput}
                  autoCapitalize="words"
                />
                {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              </>
            );
          }}
        />
      </View>

      {/* Email Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Email Address</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
            const inputRef = useRef<TextInput>(null);
            return (
              <>
                <TextInput
                  ref={inputRef}
                  style={[registerStyles.input, error && registerStyles.inputError]}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999999"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={scrollToInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              </>
            );
          }}
        />
      </View>

      {/* Password Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Password</Text>
        <View style={registerStyles.passwordContainer}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
              const inputRef = useRef<TextInput>(null);
              return (
                <>
                  <TextInput
                    ref={inputRef}
                    style={[
                      registerStyles.input,
                      registerStyles.passwordInput,
                      error && registerStyles.inputError,
                    ]}
                    placeholder="Create a password"
                    placeholderTextColor="#999999"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onFocus={scrollToInput}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
                </>
              );
            }}
          />
          <TouchableOpacity style={registerStyles.eyeButton} onPress={onTogglePassword}>
            <Text style={registerStyles.eyeButtonText}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Confirm Password</Text>
        <View style={registerStyles.passwordContainer}>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
              const inputRef = useRef<TextInput>(null);
              return (
                <>
                  <TextInput
                    ref={inputRef}
                    style={[
                      registerStyles.input,
                      registerStyles.passwordInput,
                      error && registerStyles.inputError,
                    ]}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999999"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onFocus={scrollToInput}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
                </>
              );
            }}
          />
          <TouchableOpacity
            style={registerStyles.eyeButton}
            onPress={onToggleConfirmPassword}
          >
            <Text style={registerStyles.eyeButtonText}>
              {showConfirmPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

