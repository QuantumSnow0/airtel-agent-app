import { z } from "zod";
import { parseGooglePlace } from "../google-places/parseGooglePlace";

// Step 1: Agent Information Schema
export const personalInfoSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Step 2: Contact & Location Information Schema
export const contactInfoSchema = z.object({
  airtelPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^\+?[0-9]+$/,
      "Phone number must contain only digits, optionally starting with +"
    ),
  safaricomPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^\+?[0-9]+$/,
      "Phone number must contain only digits, optionally starting with +"
    ),
  workingPlace: z.custom((value) => parseGooglePlace(value) !== null, {
    message: "Select a working location from the search results",
  }),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;

/** Profile edit — name + phones (working location is set via Places). */
export const editProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  airtelPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^\+?[0-9]+$/,
      "Phone number must contain only digits, optionally starting with +"
    ),
  safaricomPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^\+?[0-9]+$/,
      "Phone number must contain only digits, optionally starting with +"
    ),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;

