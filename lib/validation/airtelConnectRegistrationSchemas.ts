import { z } from "zod";
import { validatePhoneNumber, validateEmail, MAX_UNITS_REQUIRED } from "../utils/customerRegistration";
import { parseGooglePlace } from "../google-places/parseGooglePlace";

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (phone) => validatePhoneNumber(phone),
    "Phone number must be 10-12 digits",
  );

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .refine((email) => validateEmail(email), "Invalid email format");

const packageSchema = z.enum(["standard", "premium"], {
  message: "Package must be standard or premium",
});

const unitsRequiredSchema = z
  .number({ message: "Quantity must be a number" })
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(MAX_UNITS_REQUIRED, `Quantity cannot exceed ${MAX_UNITS_REQUIRED}`);

const customerFields = {
  customerName: z
    .string()
    .min(1, "Customer name is required")
    .min(2, "Customer name must be at least 2 characters")
    .trim(),
  phoneNumber: phoneSchema,
  email: emailSchema,
  preferredPackage: packageSchema,
  unitsRequired: unitsRequiredSchema,
  installationTown: z
    .string()
    .min(1, "Installation town is required")
    .min(2, "Installation town is too short")
    .trim(),
  landmark: z
    .string()
    .min(1, "Landmark is required")
    .min(3, "Landmark must be at least 3 characters")
    .trim(),
};

const optionalOrderIdSchema = z
  .string()
  .trim()
  .refine(
    (v) => v.length === 0 || v.length >= 3,
    "Enter a valid Airtel Connect Order ID",
  );

const requiredOrderIdSchema = z
  .string()
  .trim()
  .min(1, "Airtel Connect Order ID is required for payment")
  .min(3, "Enter a valid Airtel Connect Order ID");

/** Path A: WAM first → Connect KYC (Order ID can be added later for payment). */
export const airtelConnectRegistrationSchema = z.object({
  ...customerFields,
  airtelConnectOrderId: optionalOrderIdSchema,
});

/** Path B: Connect first → same customer fields + Order ID for payment. */
export const airtelConnectFirstRegistrationSchema = z.object({
  ...customerFields,
  airtelConnectOrderId: requiredOrderIdSchema,
});

export type AirtelConnectRegistrationFormData = z.infer<
  typeof airtelConnectRegistrationSchema
>;

export type AirtelConnectFirstRegistrationFormData = z.infer<
  typeof airtelConnectFirstRegistrationSchema
>;

/** Lead-only submit: Google Places landmark (same pin as website leads) + visit. */
export const airtelLeadSubmitSchema = z.object({
  customerName: customerFields.customerName,
  phoneNumber: customerFields.phoneNumber,
  email: customerFields.email,
  preferredPackage: customerFields.preferredPackage,
  unitsRequired: customerFields.unitsRequired,
  installationTown: customerFields.installationTown,
  googlePlace: z.custom((value) => parseGooglePlace(value) !== null, {
    message: "Select an installation landmark from the search results",
  }),
  visitDate: z
    .string()
    .min(1, "Visit date is required")
    .refine((date) => {
      const [month, day, year] = date.split("/").map(Number);
      if (!month || !day || !year) return false;
      const parsed = new Date(year, month - 1, day);
      return (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      );
    }, "Date must be in M/d/yyyy format")
    .refine((date) => {
      const [month, day, year] = date.split("/").map(Number);
      const visitDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return visitDate >= today;
    }, "Visit date cannot be in the past"),
  visitTime: z
    .string()
    .min(1, "Visit time is required")
    .refine((time) => {
      const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return false;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      return hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59;
    }, "Time must be in h:mm AM/PM format"),
});

export type AirtelLeadSubmitFormData = z.infer<typeof airtelLeadSubmitSchema>;

export type AirtelConnectEntryPath = "wam_first" | "connect_first";
