import { z } from "zod";
import { ALL_TOWNS } from "../../constants/installationLocations";
import { validatePhoneNumber, validateEmail } from "../utils/customerRegistration";

/**
 * Zod validation schemas for customer registration form
 */

// Phone number validation (10-12 digits)
const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (phone) => validatePhoneNumber(phone),
    "Phone number must be 10-12 digits"
  );

// Email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .refine((email) => validateEmail(email), "Invalid email format");

// Package validation
const packageSchema = z.enum(["standard", "premium"], {
  errorMap: () => ({ message: "Package must be either 'standard' or 'premium'" }),
});

// Town validation
const townSchema = z.enum(ALL_TOWNS as [string, ...string[]], {
  errorMap: () => ({ message: "Please select a valid town" }),
});

// Date validation (M/d/yyyy format)
const dateSchema = z
  .string()
  .min(1, "Visit date is required")
  .refine(
    (date) => {
      // Validate M/d/yyyy format
      const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (!dateRegex.test(date)) return false;
      
      // Try to parse the date
      const [month, day, year] = date.split("/").map(Number);
      const parsedDate = new Date(year, month - 1, day);
      
      // Check if date is valid
      return (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day
      );
    },
    "Date must be in M/d/yyyy format (e.g., 12/25/2024)"
  )
  .refine(
    (date) => {
      // Check if date is not in the past
      const [month, day, year] = date.split("/").map(Number);
      const visitDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return visitDate >= today;
    },
    "Visit date cannot be in the past"
  );

// Time validation (h:mm AM/PM format)
const timeSchema = z
  .string()
  .min(1, "Visit time is required")
  .refine(
    (time) => {
      const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
      if (!timeRegex.test(time)) return false;
      
      const match = time.match(timeRegex);
      if (!match) return false;
      
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      
      // Validate hours (1-12) and minutes (0-59)
      return hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59;
    },
    "Time must be in h:mm AM/PM format (e.g., 10:00 AM or 2:30 PM)"
  );

// Customer Information Schema (Step 1)
export const customerInfoSchema = z.object({
  customerName: z
    .string()
    .min(1, "Customer name is required")
    .min(2, "Customer name must be at least 2 characters")
    .trim(),
  airtelNumber: phoneSchema,
  alternateNumber: phoneSchema,
  email: emailSchema,
  preferredPackage: packageSchema,
});

// Installation Details Schema (Step 2)
export const installationDetailsSchema = z.object({
  installationTown: townSchema,
  deliveryLandmark: z
    .string()
    .min(1, "Delivery landmark is required")
    .min(5, "Delivery landmark must be at least 5 characters")
    .trim(),
  installationLocation: z
    .string()
    .min(1, "Installation location is required")
    .trim(),
});

// Visit Details Schema (Step 3)
export const visitDetailsSchema = z.object({
  visitDate: dateSchema,
  visitTime: timeSchema,
});

// Complete Customer Registration Schema
export const customerRegistrationSchema = customerInfoSchema
  .merge(installationDetailsSchema)
  .merge(visitDetailsSchema);

// Type exports
export type CustomerInfoFormData = z.infer<typeof customerInfoSchema>;
export type InstallationDetailsFormData = z.infer<
  typeof installationDetailsSchema
>;
export type VisitDetailsFormData = z.infer<typeof visitDetailsSchema>;
export type CustomerRegistrationFormData = z.infer<
  typeof customerRegistrationSchema
>;

