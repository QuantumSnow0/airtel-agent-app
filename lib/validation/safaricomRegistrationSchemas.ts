import { z } from "zod";
import {
  SAFARICOM_PACKAGE_IDS,
  type SafaricomServicePackage,
} from "../../constants/safaricomServiceAreas";
import { FIBER_DEAL_IDS } from "../../constants/safaricomFiberDeals";
import { DEDICATED_WIFI_DEAL_IDS } from "../../constants/safaricomDedicatedWifiDeals";
import { PORTABLE_5G_DEAL_IDS } from "../../constants/safaricomPortable5gDeals";
import { validatePhoneNumber, validateEmail } from "../utils/customerRegistration";

const requiredPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (phone) => validatePhoneNumber(phone),
    "Enter a valid Kenyan number (10 digits, e.g. 0712345678)"
  );

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .refine((email) => validateEmail(email), "Invalid email format");

const packageIdList = SAFARICOM_PACKAGE_IDS as readonly string[];

export const servicePackageSchema = z
  .string()
  .refine(
    (v): v is SafaricomServicePackage => packageIdList.includes(v),
    { message: "Select a package" }
  );

const packageAndDealFields = z.object({
  servicePackage: servicePackageSchema,
  fiberDealId: z.string().optional(),
  portableDealId: z.string().optional(),
  dedicatedWifiDealId: z.string().optional(),
});

const fiberLocationFields = z.object({
  fiberRegionName: z.string().optional(),
  fiberClusterName: z.string().optional(),
  fiberEstateId: z.string().optional(),
  fiberEstateName: z.string().optional(),
});

/** Portable 5G & Dedicated WiFi — free-text install site (not fibre region/cluster API). */
const portableDedicatedInstallFields = z.object({
  installCounty: z.string().optional(),
  installTown: z.string().optional(),
  installLandmark: z.string().optional(),
});

function refineStep1Deals(
  data: z.infer<typeof packageAndDealFields>,
  ctx: z.RefinementCtx
) {
  if (data.servicePackage === "home_business_fiber") {
    const id = data.fiberDealId ?? "";
    if (!id || !(FIBER_DEAL_IDS as readonly string[]).includes(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a fibre speed plan",
        path: ["fiberDealId"],
      });
    }
  }
  if (data.servicePackage === "safaricom_portable_5g") {
    const id = data.portableDealId ?? "";
    if (!id || !(PORTABLE_5G_DEAL_IDS as readonly string[]).includes(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a Portable 5G plan",
        path: ["portableDealId"],
      });
    }
  }
  if (data.servicePackage === "safaricom_dedicated_wifi") {
    const id = data.dedicatedWifiDealId ?? "";
    if (!id || !(DEDICATED_WIFI_DEAL_IDS as readonly string[]).includes(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a Dedicated WiFi plan",
        path: ["dedicatedWifiDealId"],
      });
    }
  }
}

/** Step 1 — package + plan when applicable. */
export const safaricomStep1Schema =
  packageAndDealFields.superRefine(refineStep1Deals);

/** Step 2 — Home & Business Fibre install address (region.json + estates API). */
export const safaricomFiberLocationStepSchema = z.object({
  fiberRegionName: z.string().min(1, "Select region"),
  fiberClusterName: z.string().min(1, "Select installation location"),
  fiberEstateId: z
    .string()
    .min(1, "Select building")
    .regex(/^\d+$/, "Select a building from the list"),
  fiberEstateName: z.string().min(1, "Select building"),
});

const customerFieldsSchema = z.object({
  customerName: z
    .string()
    .min(1, "Customer name is required")
    .min(2, "Customer name must be at least 2 characters")
    .trim(),
  safaricomNumber: requiredPhoneSchema,
  alternateNumber: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || validatePhoneNumber(v),
      "Enter a valid alternate number or leave blank"
    ),
  email: emailSchema,
  identificationNumber: z
    .string()
    .min(1, "Identification number is required")
    .trim()
    .min(5, "Identification number must be at least 5 characters")
    .max(32, "Identification number must be at most 32 characters"),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD"),
});

function refineFiberLocationIfPackage(
  data: z.infer<typeof packageAndDealFields> & z.infer<typeof fiberLocationFields>,
  ctx: z.RefinementCtx
) {
  if (data.servicePackage !== "home_business_fiber") {
    return;
  }
  const parsed = safaricomFiberLocationStepSchema.safeParse({
    fiberRegionName: data.fiberRegionName,
    fiberClusterName: data.fiberClusterName,
    fiberEstateId: data.fiberEstateId,
    fiberEstateName: data.fiberEstateName,
  });
  if (parsed.success) {
    return;
  }
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: [key],
      });
    }
  }
}

/** Step 2 — Portable 5G / Dedicated WiFi installation site. */
export const safaricomPortableDedicatedInstallStepSchema = z.object({
  installCounty: z.string().trim().min(1, "Select county"),
  installTown: z
    .string()
    .trim()
    .min(2, "Enter installation town (at least 2 characters)"),
  installLandmark: z
    .string()
    .trim()
    .min(2, "Enter a landmark (at least 2 characters)"),
});

function refinePortableDedicatedInstallIfPackage(
  data: z.infer<typeof packageAndDealFields> &
    z.infer<typeof portableDedicatedInstallFields>,
  ctx: z.RefinementCtx
) {
  if (
    data.servicePackage !== "safaricom_portable_5g" &&
    data.servicePackage !== "safaricom_dedicated_wifi"
  ) {
    return;
  }
  const parsed = safaricomPortableDedicatedInstallStepSchema.safeParse({
    installCounty: data.installCounty,
    installTown: data.installTown,
    installLandmark: data.installLandmark,
  });
  if (parsed.success) {
    return;
  }
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: [key],
      });
    }
  }
}

export const safaricomRegistrationSchema = packageAndDealFields
  .merge(fiberLocationFields)
  .merge(portableDedicatedInstallFields)
  .merge(customerFieldsSchema)
  .superRefine((data, ctx) => {
    refineStep1Deals(data, ctx);
    refineFiberLocationIfPackage(data, ctx);
    refinePortableDedicatedInstallIfPackage(data, ctx);
  });

export type SafaricomRegistrationFormData = z.infer<
  typeof safaricomRegistrationSchema
>;
