import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Controller, Control } from "react-hook-form";
import { PersonalInfoFormData } from "@/lib/validation/registerSchemas";
import { registerStyles } from "./styles";

interface PersonalInfoStepProps {
  control: Control<PersonalInfoFormData>;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
}

export default function PersonalInfoStep({
  control,
  showPassword,
  showConfirmPassword,
  onTogglePassword,
  onToggleConfirmPassword,
}: PersonalInfoStepProps) {
  return (
    <View style={registerStyles.form}>
      {/* Name Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Full Name</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Email Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Email Address</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <>
              <TextInput
                style={[registerStyles.input, error && registerStyles.inputError]}
                placeholder="Enter your email address"
                placeholderTextColor="#999999"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
            </>
          )}
        />
      </View>

      {/* Password Field */}
      <View style={registerStyles.fieldContainer}>
        <Text style={registerStyles.label}>Password</Text>
        <View style={registerStyles.passwordContainer}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <>
                <TextInput
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
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              </>
            )}
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
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
              <>
                <TextInput
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
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error && <Text style={registerStyles.errorText}>{error.message}</Text>}
              </>
            )}
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

