/**
 * Installation locations mapping by town
 * Maps each town to its available installation locations
 * Based on the complete list from CUSTOMER_REGISTRATION_DESIGN.md
 */

export const INSTALLATION_LOCATIONS: Record<string, string[]> = {
  Bungoma: ["CBD", "Chwele", "Kamukuywa", "Kanduyi", "Kimilili", "Sirisia"],
  Eldoret: ["Annex", "Bahati", "Munyaka", "Pioneer", "Sisibo", "Upper Eldoville", "Hillside", "Kapsoya"],
  Garissa: ["CBD", "Galbet", "Iftin", "Township", "Waberi"],
  Kakamega: ["CBD", "Butere", "Ikolomani", "Khwisero", "Lugari", "Lukuyani", "Malava", "Matungu", "Mumias", "Navakholo", "Shinyalu"],
  Kilifi: ["CBD", "Kaloleni", "Magarini", "Malindi", "Mariakani", "Mazeras", "Mtwapa", "Rabai", "Watamu"],
  Kisii: ["CBD", "Kenyeya", "Keroka", "Marani", "Masimba", "Nyacheki", "Nyamache", "Nyamarambe", "Ogembo", "Suneka", "Nyamataro", "Nyanchwa", "Jogoo", "Mwembe", "Nyakoe", "Mosocho", "Nyatieko", "Bigege", "Keumbu", "Omogonchoro", "Manga"],
  Kisumu: ["Kondele", "Lolwe Estate", "Manyatta", "Milimani Estate", "Mountain View Estate", "Nyalenda", "Okore Estate", "Polyview Estate", "Tom Mboya Estate", "Translakes Estate (Kibos Road)"],
  Kitale: ["Kitale CBD", "Milimani", "Kiminini", "Saboti", "Kongelai", "Kwanza", "Endebess", "Section 6"],
  Machakos: ["Mulolongo", "Athi River", "Konza City", "Joska", "Kangundo Road", "Mua Hills", "Central", "South Park Estate", "Encasa Apartments", "Summit Urban Estates", "Lukenya Hills Estate", "Kyumvi", "Kenya Israel", "Greenpark Estate", "Katani", "Syokimau", "Gateway Mall Gated Estate", "Gratewall"],
  Meru: ["Laare", "Nkubu", "Timau"],
  Migori: ["Migori CBD", "Rongo", "Uriri", "Awendo", "Muhuru Bay", "Isbania", "Nyatike"],
  Mombasa: ["Kongowea", "KWALE", "Ukunda", "Watamu", "Bamburi", "Changamwe", "Jomvu", "Kisauni", "Kizingo", "Likoni", "Magongo", "Mikindani", "Miritini", "Nyali", "Shanzu", "Tudor"],
  Nairobi: ["Athiriver", "Babadogo", "Bellevue", "Buru Buru", "CBD", "Chokaa", "Chuka", "Dagoreti Market", "Dandora", "Donholm", "Eastleigh", "Embakasi", "Fedha", "Gachie", "Garden Estate", "Gigiri", "Githurai", "Imara Daima", "Industrial Area", "Joska Town", "Juja", "Kahawa Sukari", "Kahawa Wendani", "Kahawa West", "Kamulu", "Kangemi", "Karen", "Kariobangi", "Kasarani", "Kawangware", "Kayole", "Kiambu", "Kikuyu", "Kileleshwa", "Kilimani", "Kinoo", "Kiserian", "Kitusuru", "Komarock", "Langata", "Lavington", "Limuru", "Lower Kabete", "Lucky Summer", "Machakos", "Mlolongo", "Mombasa Road", "Mukuru", "Muthaiga", "Mwiki", "Ngara", "Ngong Road", "Njiru", "Nyari", "Pangani", "Pipeline", "Riverside", "Rongai", "Roysambu", "Ruai", "Ruaka", "Ruiru", "Runda", "Saika", "South B", "South C", "Spring Valley", "Syokimau", "Tassia", "Thome", "Umoja", "Utawala", "Uthiru", "Westlands & Parklands", "Zimmerman"],
  Nakuru: ["Barnabas", "Flamingo", "Mireri Estates", "Naka", "Section 58", "Upper Hill", "Milimani", "Nakuru Meadows"],
};

/**
 * Get installation locations for a specific town
 */
export function getInstallationLocationsForTown(town: string): string[] {
  return INSTALLATION_LOCATIONS[town] || [];
}

/**
 * Check if a town has installation locations
 */
export function hasInstallationLocations(town: string): boolean {
  const locations = INSTALLATION_LOCATIONS[town];
  return locations && locations.length > 0;
}

/**
 * All available towns (14 total)
 */
export const ALL_TOWNS = [
  "Bungoma",
  "Eldoret",
  "Garissa",
  "Kakamega",
  "Kilifi",
  "Kisii",
  "Kisumu",
  "Kitale",
  "Machakos",
  "Meru",
  "Migori",
  "Mombasa",
  "Nairobi",
  "Nakuru",
] as const;

