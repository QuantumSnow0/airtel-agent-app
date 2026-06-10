/**
 * Public Safaricom estates API (see repo `API.md`).
 * Override in Expo: `EXPO_PUBLIC_SAFARICOM_ESTATES_API=https://your-host`
 */
export const SAFARICOM_ESTATES_API_BASE =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_SAFARICOM_ESTATES_API) ||
  "https://safaricom-api.vercel.app";
