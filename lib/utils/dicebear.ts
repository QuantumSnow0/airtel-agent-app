/** DiceBear avatar API — https://www.dicebear.com */

/** Default for most agents — gender-neutral illustrations */
export const DICEBEAR_STYLE_DEFAULT = "lorelei-neutral" as const;

export type DiceBearStyle =
  | "lorelei-neutral"
  | "lorelei"
  | "micah"
  | "avataaars"
  | "adventurer-neutral"
  | "notionists"
  | "personas";

/** Stable seed per agent — name keeps the same face across sessions */
export function getAgentAvatarSeed(
  name?: string | null,
  email?: string | null,
  userId?: string | null
): string {
  if (name?.trim()) return name.trim().toLowerCase();
  if (email?.trim()) return email.trim().toLowerCase();
  if (userId?.trim()) return userId.trim();
  return "wam-agent";
}

/**
 * Lorelei = feminine-presenting art; lorelei-neutral = inclusive default.
 * Name-based guess only — for accuracy, add a gender field on the agent profile later.
 */
export function getDiceBearStyleForName(name?: string | null): DiceBearStyle {
  if (isLikelyFemininePresentingName(name)) return "lorelei";
  return DICEBEAR_STYLE_DEFAULT;
}

function isLikelyFemininePresentingName(name?: string | null): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return false;

  const first = trimmed.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first.length < 2) return false;

  if (
    /(iah|elle|ette|lyn|ine|een|ina|isa|ora|beth|wen)$/.test(first) ||
    /(ah|eh)$/.test(first)
  ) {
    return true;
  }

  const known = new Set([
    "veronicah",
    "veronica",
    "mary",
    "grace",
    "faith",
    "hope",
    "joy",
    "mercy",
    "rose",
    "anne",
    "jane",
    "pauline",
    "naomi",
    "ruth",
    "sarah",
    "rebekah",
    "hannah",
    "esther",
    "lucy",
    "margaret",
    "catherine",
    "josephine",
    "agnes",
    "florence",
    "dorothy",
    "nancy",
    "alice",
    "helen",
    "gladys",
    "joyce",
    "brenda",
    "caroline",
    "patricia",
    "elizabeth",
    "susan",
    "linda",
    "winnie",
    "sharon",
    "diana",
    "phyllis",
    "lillian",
  ]);

  return known.has(first);
}

type DiceBearUrlOptions = {
  facialHairProbability?: number;
};

export function getDiceBearAvatarUrl(
  seed: string,
  size = 128,
  style: DiceBearStyle = DICEBEAR_STYLE_DEFAULT,
  options?: DiceBearUrlOptions
): string {
  const pixelSize = Math.max(32, Math.round(size * 2));
  const params = new URLSearchParams({
    seed: (seed ?? "").trim() || "agent",
    size: String(pixelSize),
  });

  if (style === "micah" && options?.facialHairProbability !== undefined) {
    params.set("facialHairProbability", String(options.facialHairProbability));
  }

  return `https://api.dicebear.com/9.x/${style}/png?${params.toString()}`;
}
