/**
 * Helper functions for customer registration data formatting
 * These functions format data according to Microsoft Forms requirements
 */

/**
 * Formats phone number to international format: 254XXXXXXXXX
 */
export function formatPhone(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // If already in international format (starts with 254 and length >= 12)
  if (digits.startsWith("254") && digits.length >= 12) {
    return digits;
  }

  // If starts with 0, replace with 254
  if (digits.startsWith("0")) {
    return `254${digits.substring(1)}`;
  }

  // If 9+ digits, prefix with 254
  if (digits.length >= 9) {
    return `254${digits}`;
  }

  return digits;
}

/**
 * Normalizes town name for Microsoft Forms: Remove spaces and convert to UPPERCASE
 */
export function normalizeTownForMSForms(town: string): string {
  if (!town) return town;
  return town.replace(/\s+/g, "").toUpperCase();
}

/**
 * Converts time from 12-hour format (h:mm AM/PM) to 24-hour format (HH:mm)
 */
export function convertTo24Hour(time12h: string): string {
  const timeMatch = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return time12h; // Return as-is if format doesn't match

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  const period = timeMatch[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

/**
 * Maps package name to full Microsoft Forms format
 */
export function getPackageName(packageType: "standard" | "premium"): string {
  const packageMap: Record<string, string> = {
    standard: "5G _15Mbps_30days at Ksh.2999",
    premium: "5G _30Mbps_30days at Ksh.3999",
  };

  return packageMap[packageType.toLowerCase()] || packageType;
}

/**
 * Formats installation location: combines normalized town and landmark
 */
export function formatInstallationLocation(
  town: string,
  location: string
): string {
  if (!location) return "";
  
  const normalizedTown = normalizeTownForMSForms(town);
  if (!normalizedTown) return location;
  
  return `${normalizedTown} - ${location}`;
}

/**
 * Formats date to M/d/yyyy format for Microsoft Forms
 */
export function formatDateForMSForms(date: Date): string {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Validates phone number format (10-12 digits after removing non-digits)
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 12;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Generates a UUID (for correlation ID in MS Forms submission)
 * Uses crypto.randomUUID() if available, otherwise falls back to a simple implementation
 */
export function generateUUID(): string {
  // Try to use crypto.randomUUID() if available (Node.js 14.17.0+ or browser)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

