/**
 * Installation locations mapping by town
 * Maps each town to its available installation locations
 * Based on the complete list from CUSTOMER_REGISTRATION_DESIGN.md
 */

export const INSTALLATION_LOCATIONS: Record<string, string[]> = {
  Bomet: ["CBD", "Longisa", "Ndanai", "Silibwet", "Siongiroi", "Sotik", "University"],
  Busia: ["Alupe", "Bumala", "BurumbaAngoromMayenje", "Butula", "CBD", "Nambale"],
  Bungoma: ["CBD", "Chwele", "Kamukuywa", "Kanduyi", "Kimilili", "Sirisia"],
  Chuka: ["CBD", "Chuka University", "Igambang'ombe", "Maara"],
  Eldoret: ["Annex", "Bahati", "Munyaka", "Pioneer", "Sisibo", "Upper Eldoville", "Hillside", "Kapsoya"],
  Embu: ["Blue Valley", "Itabua", "Kamiu", "Kangaru", "Majengo", "Matakari", "Njukiri"],
  Garissa: ["CBD", "Galbet", "Iftin", "Township", "Waberi"],
  "Homa Bay": ["CBD", "Kendu Bay", "Mbita", "Ndhiwa", "Gwasi", "Kaspul", "Rangwe", "Karachuonyo"],
  Isiolo: ["CBD", "Merti", "Oldonyiro"],
  Iten: ["Arror", "Chebiemit", "Chepkorio", "Chesoi", "Flax", "Iten CBD", "Kapsowar", "Kaptarakwa", "Kapyego", "Nyaru", "Tambach", "Tot"],
  Kabarnet: ["CBD", "Eldama ravine", "Marigat", "Mogotio"],
  Kakamega: ["CBD", "Butere", "Ikolomani", "Khwisero", "Lugari", "Lukuyani", "Malava", "Matungu", "Mumias", "Navakholo", "Shinyalu"],
  Kapenguria: ["CBD", "Chepkram", "Kitalakape", "Kongelai", "Kanyarkwat"],
  Kapsabet: ["CBD", "Mosoriot", "Kabiyet", "Nandi Hills", "Kaiboi"],
  Kericho: ["CBD", "Kapsaos", "Kipkelion", "Ainamoi"],
  Kerugoya: ["CBD", "Sagana", "Wanguru", "Kagumo", "Kagio"],
  Kilifi: ["CBD", "Kaloleni", "Magarini", "Malindi", "Mariakani", "Mazeras", "Mtwapa", "Rabai", "Watamu"],
  Kisii: ["CBD", "Kenyeya", "Keroka", "Marani", "Masimba", "Nyacheki", "Nyamache", "Nyamarambe", "Ogembo", "Suneka", "Nyamataro", "Nyanchwa", "Jogoo", "Mwembe", "Nyakoe", "Mosocho", "Nyatieko", "Bigege", "Keumbu", "Omogonchoro", "Manga"],
  Kisumu: ["Kondele", "Lolwe Estate", "Manyatta", "Milimani Estate", "Mountain View Estate", "Nyalenda", "Okore Estate", "Polyview Estate", "Tom Mboya Estate", "Translakes Estate (Kibos Road)"],
  Kitale: ["Kitale CBD", "Milimani", "Kiminini", "Saboti", "Kongelai", "Kwanza", "Endebess", "Section 6"],
  Kitengela: ["CBD", "Kitengela Plains", "Boston", "Chuna", "Muigai Prestige", "Milimani", "Kitengela Breeze", "The Riverine"],
  Kitui: ["Township", "Kwa Ngendu Estate", "Kalawa Road Estate", "Kyangwithya East & West", "Kwa Vonza/Yatta", "Kauwi", "Mutomo", "Kyuso", "Zombe", "Itoleka", "Tulia", "Kyanika"],
  Lodwar: ["Lodwar CBD", "Loima", "Lokichar", "Kalokol", "Kakuma", "Lokichogio"],
  Luanda: ["Vihiga Municipality", "Chavagali", "Mbale CBD", "Serem", "Kaimosi", "Hamisi", "Sabatia", "Majengo-Vihiga"],
  Machakos: ["Mulolongo", "Athi River", "Konza City", "Joska", "Kangundo Road", "Mua Hills", "Central", "South Park Estate", "Encasa Apartments", "Summit Urban Estates", "Lukenya Hills Estate", "Kyumvi", "Kenya Israel", "Greenpark Estate", "Katani", "Syokimau", "Gateway Mall Gated Estate", "Gratewall"],
  Malindi: ["Township"],
  Mandera: ["CBD", "Rhamu", "El Wak", "Takaba"],
  Maralal: ["CBD", "Wamba", "Kisima", "Baragoi", "Lodosoit", "Archers Post"],
  Marsabit: ["CBD", "Moyale", "Ileret", "Laisamis", "Loiyangalani"],
  Maua: ["Maili Tatu", "Mutuati", "Kimongoro", "Athiru", "Kithetu", "Kiegoi"],
  Meru: ["Laare", "Nkubu", "Timau"],
  Migori: ["Migori CBD", "Rongo", "Uriri", "Awendo", "Muhuru Bay", "Isbania", "Nyatike"],
  Mombasa: ["Kongowea", "KWALE", "Ukunda", "Watamu", "Bamburi", "Changamwe", "Jomvu", "Kisauni", "Kizingo", "Likoni", "Magongo", "Mikindani", "Miritini", "Nyali", "Shanzu", "Tudor"],
  "Murang'a": ["CBD", "Kangema", "Kiharu", "Kabati", "Kandara", "Maragua", "Makuyu", "Kiriani", "Gatura"],
  Nairobi: ["Athiriver", "Babadogo", "Bellevue", "Buru Buru", "CBD", "Chokaa", "Chuka", "Dagoreti Market", "Dandora", "Donholm", "Eastleigh", "Embakasi", "Fedha", "Gachie", "Garden Estate", "Gigiri", "Githurai", "Imara Daima", "Industrial Area", "Joska Town", "Juja", "Kahawa Sukari", "Kahawa Wendani", "Kahawa West", "Kamulu", "Kangemi", "Karen", "Kariobangi", "Kasarani", "Kawangware", "Kayole", "Kiambu", "Kikuyu", "Kileleshwa", "Kilimani", "Kinoo", "Kiserian", "Kitusuru", "Komarock", "Langata", "Lavington", "Limuru", "Lower Kabete", "Lucky Summer", "Machakos", "Mlolongo", "Mombasa Road", "Mukuru", "Muthaiga", "Mwiki", "Ngara", "Ngong Road", "Njiru", "Nyari", "Pangani", "Pipeline", "Riverside", "Rongai", "Roysambu", "Ruai", "Ruaka", "Ruiru", "Runda", "Saika", "South B", "South C", "Spring Valley", "Syokimau", "Tassia", "Thome", "Umoja", "Utawala", "Uthiru", "Westlands & Parklands", "Zimmerman"],
  Naivasha: ["Kabati", "Kayole Naivasha", "Kehoto", "Karagita", "Kamere", "Fly-Over", "Delamere", "Naivasha CBD", "Mirera", "Mai Mahiu"],
  Nakuru: ["Barnabas", "Flamingo", "Mireri Estates", "Naka", "Section 58", "Upper Hill", "Milimani", "Nakuru Meadows"],
  Nanyuki: ["Mount Kenya Wildlife Estate (MKWE)", "Mukima Ridge", "Muthaiga Estate Nanyuki", "Sweetwaters / Baraka Estate", "Sarova Maiyan Villas", "Ol Saruni Gardens", "Beverly Acres", "Airstrip Gardens", "Fahari Ridge 2", "Nanyuki Town Centre", "Bargain Area", "Timau Belt", "Likii Estate", "Kwa Huku Estate", "Nkando Estate", "Snow View Estate", "Madison Lane", "Cedar Mall Estate", "Burguret Area", "Daiga & Ethi", "Jua Kali Zone"],
  Narok: ["Lenana Estate", "Olerai Estate", "Tumaini Estate", "Ilmashariani", "Leleshwa", "Maasai Mara", "Ololulunga", "Nkareta", "London Estate"],
  Nyahururu: ["CBD", "Gatundia Estate", "Igwamiti", "Madaraka Estate", "Mairo Inya", "Ndururumo Area", "Ngano Estate"],
  Nyamira: ["CBD", "Ekerubo", "Kebirigo", "Kijauri", "Nyansiongo"],
  Nyeri: ["CBD", "Chaka", "Endarasha", "Karatina", "Mukurwe ini", "Mweiga", "Naro Moru", "Othaya"],
  Ruiru: ["Daykio Bustani Estate", "Easternville Estate", "Kamakis", "Kamiti", "Membley Estate", "Mhasibu Bustani Estate", "Mugutha", "Ruiru Town", "Tatu City"],
  Siaya: ["Bondo", "CBD", "Ugunja", "Ugenya", "Yala", "Gem", "Sega"],
  Thika: ["Ngoingwa", "CBD", "Makongeni", "Kiahuria"],
  Voi: ["CBD", "Kasigau", "Marungu", "Mbololo", "Ngolia", "Sagalla"],
  Wajir: ["Habaswein", "CBD", "Hadado", "Tarbaj", "Diff", "Eldas", "Bute"],
  Webuye: ["CBD", "Bokoli", "Cheptulu", "Maraka", "Matulo", "Mihuu", "Misikhu", "Ndivisi", "Sitikho"],
  Wote: ["CBD", "Kaiti", "Makueni"],
  Olkalou: ["Gichungo", "Kaimbaga", "Rurii"],
  Magumu: ["CBD", "Forest", "Njabini", "Kibiru", "Mukera", "Kinangop"],
  Mwea: ["CBD", "Kimbimbi", "Kutus"],
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
 * All available towns (52 total)
 */
export const ALL_TOWNS = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Malindi",
  "Kitale",
  "Garissa",
  "Kakamega",
  "Nyeri",
  "Meru",
  "Machakos",
  "Embu",
  "Kericho",
  "Bungoma",
  "Busia",
  "Homa Bay",
  "Kisii",
  "Bomet",
  "Chuka",
  "Isiolo",
  "Iten",
  "Kabarnet",
  "Kapenguria",
  "Kapsabet",
  "Kerugoya",
  "Kilifi",
  "Kitengela",
  "Kitui",
  "Lodwar",
  "Luanda",
  "Mandera",
  "Maralal",
  "Marsabit",
  "Maua",
  "Migori",
  "Murang'a",
  "Naivasha",
  "Nanyuki",
  "Narok",
  "Nyahururu",
  "Nyamira",
  "Ruiru",
  "Siaya",
  "Voi",
  "Wajir",
  "Webuye",
  "Wote",
  "Olkalou",
  "Magumu",
  "Mwea",
] as const;

