/** Pure phone helpers (no React Native / Supabase imports). */

export function normalizeKePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let digits = String(raw).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    digits = `254${digits}`;
  }
  return digits;
}
