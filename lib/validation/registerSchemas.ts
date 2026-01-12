import { z } from "zod";

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
  town: z.string().min(1, "Please select a town"),
  area: z.string().min(1, "Please enter a location"),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;

