# Customer Registration Design

## Instructions
Please paste your customer registration flow documentation below this line:

---

# Customer Registration - Microsoft Forms Integration Guide

This document explains how the customer registration system integrates with Microsoft Forms for submitting lead/order data to Airtel's internal workflow system.

## Overview

The system allows agents to register customers for Airtel SmartConnect 5G/FTTx services. Customer data is submitted to Microsoft Forms using their API, which integrates with Airtel's existing lead management workflow.

---

## Environment Variables Required

```env
MS_FORMS_FORM_ID=JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UQjc4M0wwWU9HRTJPRjMxWlc5QjRLOUhaMC4u
MS_FORMS_TENANT_ID=16c73727-979c-4d82-b3a7-eb6a2fddfe57
MS_FORMS_USER_ID=7726dd57-48bb-4c89-9e1e-f2669916f1fe
MS_FORMS_RESPONSE_PAGE_URL=https://forms.cloud.microsoft/
```

**Note:** These are the actual values for the Airtel SmartConnect lead capture form. Use these exact values.

---

## Microsoft Forms Question IDs

Each field in the Microsoft Form has a unique Question ID. These must be used exactly as shown:

```javascript
const QUESTION_IDS = {
  agentType: "r0feee2e2bc7c44fb9af400709e7e6276",
  enterpriseCP: "r52e9f6e788444e2a96d9e30de5d635d8",
  agentName: "rcf88d2d33e8c4ed4b33ccc91fec1d771",
  agentMobile: "r2855e7f8fcfb44c98a2c5797e8e9b087",
  totalUnitsRequired: "r5d2a658a265b4f3ea2ad9aee1c8bc9c5",
  leadType: "rd897bb0eb8344bafaaf8db07a535a049",
  connectionType: "r4ceb180775c04d5a92a39fd687573090",
  customerName: "r3af4eebb47ff46b78eb4118311884f53",
  airtelNumber: "r8b0d2eb8e038433f8ce4888e07bed122",
  alternateNumber: "r401284e3fee94602a39ed9a0a14890ea",
  email: "r5dbc62a93dc64f3d84a2442f5ea4a856",
  preferredPackage: "r819c212e954f4367acaba71082424415",
  installationTown: "rc89257414e57426dac9a183c60a4b556",
  deliveryLandmark: "r7a69684d43ec4bf1b6971b21a8b4dd18",
  visitDate: "r68b858271107400189b8d681d1b19c38",
  visitTime: "rae98a58cb06949c1a3222443368aa64e",
  installationLocation: "r55f328ec020a4a629f58639cd56ecd85",
  optionalField: "r1e3b5a91acaa465b8aab76bab2cad94a",
};
```

**✅ These are the exact Question IDs for the Airtel SmartConnect Microsoft Form.** Use these values as-is - no need to extract or modify them.

---

## Data Fields Structure

### Internal/Auto-filled Fields (Not from Agent)

These fields are automatically populated and should NOT be collected from agents:

```javascript
const INTERNAL_DEFAULTS = {
  agentType: "Enterprise", // Fixed value
  enterpriseCP: "WAM APPLICATIONS", // Fixed value
  agentName: "samson karau maingi", // Agent name (can be dynamic per agent)
  agentMobile: "0789457580", // Agent mobile (can be dynamic per agent)
  leadType: "Confirmed", // Fixed value
  connectionType: "SmartConnect (5G ODU)", // Fixed value
  totalUnitsRequired: "1", // Fixed value (default is 1)
};
```

**Note:** In an agent dashboard, `agentName` and `agentMobile` should be pulled from the authenticated agent's profile, not hardcoded.

### Customer Fields (Collected from Agent/Form)

These are the fields that agents need to fill in:

| Field Name             | Type   | Required | Format/Notes                                               |
| ---------------------- | ------ | -------- | ---------------------------------------------------------- |
| `customerName`         | String | Yes      | Full customer name                                         |
| `airtelNumber`         | String | Yes      | Customer's Airtel phone number                             |
| `alternateNumber`      | String | Yes      | Customer's alternative phone number                        |
| `email`                | String | Yes      | Valid email address                                        |
| `preferredPackage`     | String | Yes      | Either `"standard"` or `"premium"`                         |
| `installationTown`     | String | Yes      | Town name (see normalization below)                        |
| `deliveryLandmark`     | String | Yes      | Specific landmark/delivery location                        |
| `installationLocation` | String | Yes      | Specific location within town (e.g., "Kangemi", "Langata") |
| `visitDate`            | String | Yes      | Date in format: `M/d/yyyy` (e.g., "12/25/2024")            |
| `visitTime`            | String | Yes      | Time in 12-hour format: `h:mm AM/PM` (e.g., "10:00 AM")    |

### Field Validation Rules

Before submitting, validate the following:

- **Customer Name:** Minimum 2 characters (after trimming whitespace)
- **Phone Numbers (Airtel & Alternate):** Must be 10-12 digits (spaces are ignored during validation)
- **Email:** Must match standard email format (`user@domain.com`)
- **Installation Town:** Must not be empty
- **Delivery Landmark:** Minimum 5 characters (after trimming whitespace)
- **Installation Location:** Must not be empty (unless "Other" is selected, then custom input must be provided)
- **Visit Date:** Must not be empty, format must be `M/d/yyyy` (e.g., "1/15/2024" or "12/25/2024")
- **Visit Time:** Must not be empty, format must be `h:mm AM/PM` (e.g., "9:00 AM" or "2:30 PM")
- **Preferred Package:** Must be either `"standard"` or `"premium"` (case-insensitive)

**Validation Examples:**

```javascript
// Valid phone numbers (after formatting):
"0712345678" → "254712345678" ✅
"254712345678" → "254712345678" ✅
"712345678" → "254712345678" ✅

// Invalid:
"12345" → Too short ❌
"071234567890123" → Too long ❌

// Valid email:
"customer@example.com" ✅
"user.name@domain.co.ke" ✅

// Invalid email:
"invalid" ❌
"@domain.com" ❌
"user@" ❌
```

---

## Data Processing & Formatting

### 1. Phone Number Formatting

All phone numbers must be converted to international format: `254XXXXXXXXX`

```javascript
function formatPhone(phone) {
  const digits = phone.replace(/\D/g, ""); // Remove all non-digits

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

// Examples:
// "0712345678" → "254712345678"
// "712345678" → "254712345678"
// "254712345678" → "254712345678" (unchanged)
```

### 2. Town Name Normalization

Town names must be normalized for Microsoft Forms: **Remove all spaces and convert to UPPERCASE**

```javascript
function normalizeTownForMSForms(town) {
  if (!town) return town;
  return town.replace(/\s+/g, "").toUpperCase();
}

// Examples:
// "Homa Bay" → "HOMABAY"
// "Nairobi" → "NAIROBI"
// "Nakuru" → "NAKURU"
```

**Available Towns (52 total):**

- Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Thika, Malindi, Kitale, Garissa, Kakamega, Nyeri, Meru, Machakos, Embu, Kericho, Bungoma, Busia, Homa Bay, Kisii, Bomet, Chuka, Isiolo, Iten, Kabarnet, Kapenguria, Kapsabet, Kerugoya, Kilifi, Kitengela, Kitui, Lodwar, Luanda, Mandera, Maralal, Marsabit, Maua, Migori, Murang'a, Naivasha, Nanyuki, Narok, Nyahururu, Nyamira, Ruiru, Siaya, Voi, Wajir, Webuye, Wote, Olkalou, Magumu, Mwea

---

## Complete Installation Locations by Town

Below is the complete list of all installation locations available for each town. When a customer selects a town, they can then select from these specific locations within that town. If their location is not listed, they can select "Other" and enter a custom location.

### Bomet

- CBD, Longisa, Ndanai, Silibwet, Siongiroi, Sotik, University

### Busia

- Alupe, Bumala, BurumbaAngoromMayenje, Butula, CBD, Nambale

### Bungoma

- CBD, Chwele, Kamukuywa, Kanduyi, Kimilili, Sirisia

### Chuka

- CBD, Chuka University, Igambang'ombe, Maara

### Eldoret

- Annex, Bahati, Munyaka, Pioneer, Sisibo, Upper Eldoville, Hillside, Kapsoya

### Embu

- Blue Valley, Itabua, Kamiu, Kangaru, Majengo, Matakari, Njukiri

### Garissa

- CBD, Galbet, Iftin, Township, Waberi

### Homa Bay

- CBD, Kendu Bay, Mbita, Ndhiwa, Gwasi, Kaspul, Rangwe, Karachuonyo

### Isiolo

- CBD, Merti, Oldonyiro

### Iten

- Arror, Chebiemit, Chepkorio, Chesoi, Flax, Iten CBD, Kapsowar, Kaptarakwa, Kapyego, Nyaru, Tambach, Tot

### Kabarnet

- CBD, Eldama ravine, Marigat, Mogotio

### Kakamega

- CBD, Butere, Ikolomani, Khwisero, Lugari, Lukuyani, Malava, Matungu, Mumias, Navakholo, Shinyalu

### Kapenguria

- CBD, Chepkram, Kitalakape, Kongelai, Kanyarkwat

### Kapsabet

- CBD, Mosoriot, Kabiyet, Nandi Hills, Kaiboi

### Kericho

- CBD, Kapsaos, Kipkelion, Ainamoi

### Kerugoya

- CBD, Sagana, Wanguru, Kagumo, Kagio

### Kilifi

- CBD, Kaloleni, Magarini, Malindi, Mariakani, Mazeras, Mtwapa, Rabai, Watamu

### Kisii

- CBD, Kenyeya, Keroka, Marani, Masimba, Nyacheki, Nyamache, Nyamarambe, Ogembo, Suneka, Nyamataro, Nyanchwa, Jogoo, Mwembe, Nyakoe, Mosocho, Nyatieko, Bigege, Keumbu, Omogonchoro, Manga

### Kisumu

- Kondele, Lolwe Estate, Manyatta, Milimani Estate, Mountain View Estate, Nyalenda, Okore Estate, Polyview Estate, Tom Mboya Estate, Translakes Estate (Kibos Road)

### Kitale

- Kitale CBD, Milimani, Kiminini, Saboti, Kongelai, Kwanza, Endebess, Section 6

### Kitengela

- CBD, Kitengela Plains, Boston, Chuna, Muigai Prestige, Milimani, Kitengela Breeze, The Riverine

### Kitui

- Township, Kwa Ngendu Estate, Kalawa Road Estate, Kyangwithya East & West, Kwa Vonza/Yatta, Kauwi, Mutomo, Kyuso, Zombe, Itoleka, Tulia, Kyanika

### Lodwar

- Lodwar CBD, Loima, Lokichar, Kalokol, Kakuma, Lokichogio

### Luanda

- Vihiga Municipality, Chavagali, Mbale CBD, Serem, Kaimosi, Hamisi, Sabatia, Majengo-Vihiga

### Machakos

- Mulolongo, Athi River, Konza City, Joska, Kangundo Road, Mua Hills, Central, South Park Estate, Encasa Apartments, Summit Urban Estates, Lukenya Hills Estate, Kyumvi, Kenya Israel, Greenpark Estate, Katani, Syokimau, Gateway Mall Gated Estate, Gratewall

### Malindi

- Township

### Mandera

- CBD, Rhamu, El Wak, Takaba

### Maralal

- CBD, Wamba, Kisima, Baragoi, Lodosoit, Archers Post

### Marsabit

- CBD, Moyale, Ileret, Laisamis, Loiyangalani

### Maua

- Maili Tatu, Mutuati, Kimongoro, Athiru, Kithetu, Kiegoi

### Meru

- Laare, Nkubu, Timau

### Migori

- Migori CBD, Rongo, Uriri, Awendo, Muhuru Bay, Isbania, Nyatike

### Mombasa

- Kongowea, KWALE, Ukunda, Watamu, Bamburi, Changamwe, Jomvu, Kisauni, Kizingo, Likoni, Magongo, Mikindani, Miritini, Nyali, Shanzu, Tudor

### Murang'a

- CBD, Kangema, Kiharu, Kabati, Kandara, Maragua, Makuyu, Kiriani, Gatura

### Nairobi

- Athiriver, Babadogo, Bellevue, Buru Buru, CBD, Chokaa, Chuka, Dagoreti Market, Dandora, Donholm, Eastleigh, Embakasi, Fedha, Gachie, Garden Estate, Gigiri, Githurai, Imara Daima, Industrial Area, Joska Town, Juja, Kahawa Sukari, Kahawa Wendani, Kahawa West, Kamulu, Kangemi, Karen, Kariobangi, Kasarani, Kawangware, Kayole, Kiambu, Kikuyu, Kileleshwa, Kilimani, Kinoo, Kiserian, Kitusuru, Komarock, Langata, Lavington, Limuru, Lower Kabete, Lucky Summer, Machakos, Mlolongo, Mombasa Road, Mukuru, Muthaiga, Mwiki, Ngara, Ngong Road, Njiru, Nyari, Pangani, Pipeline, Riverside, Rongai, Roysambu, Ruai, Ruaka, Ruiru, Runda, Saika, South B, South C, Spring Valley, Syokimau, Tassia, Thome, Umoja, Utawala, Uthiru, Westlands & Parklands, Zimmerman

### Naivasha

- Kabati, Kayole Naivasha, Kehoto, Karagita, Kamere, Fly-Over, Delamere, Naivasha CBD, Mirera, Mai Mahiu

### Nakuru

- Barnabas, Flamingo, Mireri Estates, Naka, Section 58, Upper Hill, Milimani, Nakuru Meadows

### Nanyuki

- Mount Kenya Wildlife Estate (MKWE), Mukima Ridge, Muthaiga Estate Nanyuki, Sweetwaters / Baraka Estate, Sarova Maiyan Villas, Ol Saruni Gardens, Beverly Acres, Airstrip Gardens, Fahari Ridge 2, Nanyuki Town Centre, Bargain Area, Timau Belt, Likii Estate, Kwa Huku Estate, Nkando Estate, Snow View Estate, Madison Lane, Cedar Mall Estate, Burguret Area, Daiga & Ethi, Jua Kali Zone

### Narok

- Lenana Estate, Olerai Estate, Tumaini Estate, Ilmashariani, Leleshwa, Maasai Mara, Ololulunga, Nkareta, London Estate

### Nyahururu

- CBD, Gatundia Estate, Igwamiti, Madaraka Estate, Mairo Inya, Ndururumo Area, Ngano Estate

### Nyamira

- CBD, Ekerubo, Kebirigo, Kijauri, Nyansiongo

### Nyeri

- CBD, Chaka, Endarasha, Karatina, Mukurwe ini, Mweiga, Naro Moru, Othaya

### Ruiru

- Daykio Bustani Estate, Easternville Estate, Kamakis, Kamiti, Membley Estate, Mhasibu Bustani Estate, Mugutha, Ruiru Town, Tatu City

### Siaya

- Bondo, CBD, Ugunja, Ugenya, Yala, Gem, Sega

### Thika

- Ngoingwa, CBD, Makongeni, Kiahuria

### Voi

- CBD, Kasigau, Marungu, Mbololo, Ngolia, Sagalla

### Wajir

- Habaswein, CBD, Hadado, Tarbaj, Diff, Eldas, Bute

### Webuye

- CBD, Bokoli, Cheptulu, Maraka, Matulo, Mihuu, Misikhu, Ndivisi, Sitikho

### Wote

- CBD, Kaiti, Makueni

### Olkalou

- Gichungo, Kaimbaga, Rurii

### Magumu

- CBD, Forest, Njabini, Kibiru, Mukera, Kinangop

### Mwea

- CBD, Kimbimbi, Kutus

### 3. Installation Location Format

The `installationLocation` field must combine normalized town and landmark:

```javascript
// installationLocationLandmark is just the landmark (e.g., "Kangemi")
// normalizedTown is the normalized town (e.g., "NAIROBI")

const installationLocation =
  installationLocationLandmark && normalizedTown
    ? `${normalizedTown} - ${installationLocationLandmark}`
    : installationLocationLandmark || "";

// Example:
// Town: "Homa Bay" → "HOMABAY"
// Landmark: "Kangemi"
// Result: "HOMABAY - Kangemi"
```

### 4. Package Name Mapping

Package names must be converted to full Microsoft Forms format:

```javascript
const packageMap = {
  standard: "5G _15Mbps_30days at Ksh.2999",
  premium: "5G _30Mbps_30days at Ksh.3999",
};

const fullPackageName =
  packageMap[preferredPackage.toLowerCase()] || preferredPackage;
```

**⚠️ Important:** The format must match exactly as shown above, including underscores and spacing.

### 5. Time Format Conversion

Time must be converted from 12-hour format to 24-hour format:

```javascript
function convertTo24Hour(time12h) {
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

// Examples:
// "10:00 AM" → "10:00"
// "2:30 PM" → "14:30"
// "12:00 PM" → "12:00"
// "12:00 AM" → "00:00"
```

---

## Submission Flow

### Step 1: Fetch Microsoft Forms Tokens

Before submitting, you need to fetch authentication tokens and cookies from Microsoft Forms:

```javascript
async function fetchMSTokens(responsePageUrl) {
  const tokenResponse = await fetch(responsePageUrl, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br, zstd",
    },
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to fetch tokens: ${tokenResponse.status}`);
  }

  // Extract cookies from Set-Cookie headers
  const setCookieHeaders = tokenResponse.headers.getSetCookie();
  const cookies = [];
  let formsSessionId = "";
  let requestVerificationToken = "";
  let muid = "";
  let msalCacheEncryption = "";

  for (const cookie of setCookieHeaders) {
    const cookiePair = cookie.split(";")[0];
    cookies.push(cookiePair);

    if (cookie.startsWith("FormsWebSessionId=")) {
      formsSessionId = cookiePair.split("FormsWebSessionId=")[1];
    }
    if (cookie.startsWith("__RequestVerificationToken=")) {
      requestVerificationToken = cookiePair.split(
        "__RequestVerificationToken="
      )[1];
    }
    if (cookie.startsWith("MUID=")) {
      muid = cookiePair.split("MUID=")[1];
    }
    if (cookie.startsWith("msal.cache.encryption=")) {
      msalCacheEncryption = cookiePair.split("msal.cache.encryption=")[1];
    }
  }

  const cookieString = cookies.join("; ");

  // Extract __RequestVerificationToken from response body
  const html = await tokenResponse.text();
  const tokenMatch = html.match(
    /name="__RequestVerificationToken"\s+value="([^"]+)"/
  );
  if (tokenMatch) {
    requestVerificationToken = tokenMatch[1];
  }

  // Extract user and tenant IDs from HTML or use defaults
  const userIdMatch = html.match(/"userId":"([^"]+)"/);
  const tenantMatch = html.match(/"tenantId":"([^"]+)"/);
  const userId = userIdMatch ? userIdMatch[1] : MS_FORMS_USER_ID;
  const tenantId = tenantMatch ? tenantMatch[1] : MS_FORMS_TENANT_ID;

  // Extract x-usersessionid from response headers
  // If not present, generate a UUID (use crypto.randomUUID() or uuid library)
  const userSessionId =
    tokenResponse.headers.get("x-usersessionid") || generateUUID();

  return {
    requestVerificationToken,
    cookieString,
    muid,
    userSessionId,
    userId,
    tenantId,
  };
}
```

### Step 2: Build Microsoft Forms Payload

Construct the answers array in the exact order shown:

```javascript
function buildMSFormsPayload(customerData, internalDefaults, questionIds) {
  const startDate = new Date().toISOString();
  const submitDate = new Date().toISOString();
  // Generate UUID for correlation ID (use crypto.randomUUID() or uuid library)
  const correlationId = generateUUID();

  // Format and normalize data
  const normalizedTown = normalizeTownForMSForms(customerData.installationTown);
  const installationLocation =
    customerData.installationLocation && normalizedTown
      ? `${normalizedTown} - ${customerData.installationLocation}`
      : customerData.installationLocation || "";

  const formattedAirtelNumber = formatPhone(customerData.airtelNumber);
  const formattedAlternateNumber = formatPhone(customerData.alternateNumber);
  const formattedAgentMobile = formatPhone(internalDefaults.agentMobile);

  const packageMap = {
    standard: "5G _15Mbps_30days at Ksh.2999",
    premium: "5G _30Mbps_30days at Ksh.3999",
  };
  const fullPackageName =
    packageMap[customerData.preferredPackage.toLowerCase()] ||
    customerData.preferredPackage;

  const time24Hour = convertTo24Hour(customerData.visitTime);

  // Build answers array - ORDER IS CRITICAL
  const answers = [
    {
      questionId: questionIds.agentType,
      answer1: internalDefaults.agentType,
    },
    {
      questionId: questionIds.enterpriseCP,
      answer1: internalDefaults.enterpriseCP,
    },
    {
      questionId: questionIds.agentName,
      answer1: internalDefaults.agentName,
    },
    {
      questionId: questionIds.agentMobile,
      answer1: formattedAgentMobile, // e.g., "254789457580"
    },
    {
      questionId: questionIds.leadType,
      answer1: internalDefaults.leadType,
    },
    {
      questionId: questionIds.totalUnitsRequired,
      answer1: "1",
    },
    {
      questionId: questionIds.connectionType,
      answer1: internalDefaults.connectionType,
    },
    {
      questionId: questionIds.customerName,
      answer1: customerData.customerName,
    },
    {
      questionId: questionIds.airtelNumber,
      answer1: formattedAirtelNumber,
    },
    {
      questionId: questionIds.alternateNumber,
      answer1: formattedAlternateNumber,
    },
    {
      questionId: questionIds.email,
      answer1: customerData.email,
    },
    {
      questionId: questionIds.preferredPackage,
      answer1: fullPackageName,
    },
    {
      questionId: questionIds.visitDate,
      answer1: customerData.visitDate, // Format: M/d/yyyy
    },
    {
      questionId: questionIds.visitTime,
      answer1: time24Hour, // Format: HH:mm (24-hour)
    },
    {
      questionId: questionIds.deliveryLandmark,
      answer1: customerData.deliveryLandmark,
    },
    {
      questionId: questionIds.installationTown,
      answer1: normalizedTown, // e.g., "HOMABAY" not "Homa Bay"
    },
    {
      questionId: questionIds.installationLocation,
      answer1: installationLocation, // e.g., "HOMABAY - Kangemi"
    },
    {
      questionId: questionIds.optionalField,
      answer1: null,
    },
  ];

  return {
    startDate,
    submitDate,
    answers: JSON.stringify(answers), // Must be stringified!
    correlationId,
  };
}
```

### Step 3: Submit to Microsoft Forms API

```javascript
async function submitToMSForms(formId, tenantId, userId, payload, tokens) {
  // URL encode the form ID - note: single quotes in URL are encoded as %27
  const encodedFormId = encodeURIComponent(formId);
  const msFormsUrl = `https://forms.guest.usercontent.microsoft/formapi/api/${tenantId}/users/${userId}/forms(%27${encodedFormId}%27)/responses`;

  const response = await fetch(msFormsUrl, {
    method: "POST",
    headers: {
      __requestverificationtoken: tokens.requestVerificationToken,
      accept: "application/json",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      authorization: "",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Host: "forms.guest.usercontent.microsoft",
      "odata-maxverion": "4.0",
      "odata-version": "4.0",
      Origin: "https://forms.cloud.microsoft",
      Referer: "https://forms.cloud.microsoft/",
      "sec-ch-ua":
        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      "x-correlationid": payload.correlationId,
      "x-ms-form-muid": tokens.muid || "",
      "x-ms-form-request-ring": "business",
      "x-ms-form-request-source": "ms-formweb",
      "x-usersessionid": tokens.userSessionId,
      Cookie: tokens.cookieString,
    },
    body: JSON.stringify({
      startDate: payload.startDate,
      submitDate: payload.submitDate,
      answers: payload.answers,
    }),
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch (jsonError) {
    const textResponse = await response.text();
    throw new Error(
      `Microsoft Forms submission failed: ${
        response.status
      } - ${textResponse.substring(0, 500)}`
    );
  }

  if (!response.ok) {
    // Check if form is closed
    if (
      response.status === 403 &&
      responseData?.error?.message?.includes("closed")
    ) {
      throw new Error(
        "Microsoft Forms form is closed. Please reopen the form in Microsoft Forms to enable submissions."
      );
    }

    throw new Error(
      `Microsoft Forms submission failed: ${response.status} - ${JSON.stringify(
        responseData
      )}`
    );
  }

  // Success!
  const responseId = responseData?.id || null;
  return {
    success: true,
    responseId,
    submitDate: responseData?.submitDate,
    responder: responseData?.responder,
  };
}
```

---

## Complete Implementation Example

Here's a complete example combining all steps:

```javascript
async function registerCustomer(customerData, agentData) {
  try {
    // Step 1: Fetch tokens
    const tokens = await fetchMSTokens(MS_FORMS_RESPONSE_PAGE_URL);

    // Step 2: Build payload
    const internalDefaults = {
      agentType: "Enterprise",
      enterpriseCP: "WAM APPLICATIONS",
      agentName: agentData.name, // From authenticated agent
      agentMobile: agentData.mobile, // From authenticated agent
      leadType: "Confirmed",
      connectionType: "SmartConnect (5G ODU)",
    };

    const payload = buildMSFormsPayload(
      customerData,
      internalDefaults,
      QUESTION_IDS
    );

    // Step 3: Submit to MS Forms
    const result = await submitToMSForms(
      MS_FORMS_FORM_ID,
      tokens.tenantId,
      tokens.userId,
      payload,
      tokens
    );

    return {
      success: true,
      msFormsResponseId: result.responseId,
      message: "Customer registered successfully",
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}
```

---

## Error Handling

### Common Errors

1. **403 Forbidden - Form Closed**

   - **Error:** `"Microsoft Forms form is closed"`
   - **Solution:** Open the form in Microsoft Forms to allow submissions

2. **Token Expired**

   - **Error:** 401 or 403 with authentication error
   - **Solution:** Re-fetch tokens and retry submission

3. **Invalid Question ID**

   - **Error:** 400 Bad Request
   - **Solution:** Ensure you're using the exact Question IDs provided in this document

4. **Invalid Data Format**
   - **Error:** Validation error in response
   - **Solution:** Ensure all data is properly formatted (phone numbers, dates, town names)

### Best Practices

1. **Always save data locally first** before submitting to MS Forms
2. **Implement retry logic** for transient failures
3. **Log all submissions** for debugging
4. **Handle partial failures** gracefully (data saved but MS Forms failed)

---

## API Request/Response Examples

### Successful Submission Response

```json
{
  "success": true,
  "msFormsResponseId": "response-id-here",
  "message": "Form submitted successfully to Microsoft Forms"
}
```

### Error Response (Form Closed)

```json
{
  "success": false,
  "error": "Microsoft Forms form is closed. Please reopen the form in Microsoft Forms to enable submissions."
}
```

### Error Response (Token Issue)

```json
{
  "success": false,
  "error": "Failed to fetch tokens: 500"
}
```

---

## Important Notes

1. **Question IDs are correct:** These Question IDs are for the Airtel SmartConnect Microsoft Form. Use them exactly as shown.

2. **Order matters:** The `answers` array must be in the exact order shown above.

3. **Token freshness:** Tokens from Step 1 should be used immediately. Don't cache them for long periods.

4. **Form must be open:** The Microsoft Form must be accepting responses (not closed) for submissions to work.

5. **Rate limiting:** Be mindful of Microsoft Forms rate limits. Don't submit too many requests too quickly.

6. **Validation:** Always validate customer data before submission (email format, phone numbers, required fields).

---

## Testing Checklist

- [ ] Test with valid customer data
- [ ] Test phone number formatting (various formats)
- [ ] Test town name normalization (spaces, case)
- [ ] Test package name mapping
- [ ] Test time format conversion
- [ ] Test with closed form (error handling)
- [ ] Test token refresh on failure
- [ ] Test all 52 town names
- [ ] Verify response ID is captured
- [ ] Test error responses are handled gracefully

---

## Support & Troubleshooting

If you encounter issues:

1. **Verify Form Status:** Ensure the Microsoft Form is accepting responses (not closed)
2. **Check Data Format:** Ensure all formatting matches exactly (phone numbers, town names, dates, times)
3. **Verify Environment Variables:** Ensure MS_FORMS_FORM_ID matches the form ID above
4. **Review Logs:** Check server logs for detailed error messages
5. **Test Token Fetch:** Ensure the token fetch step is working correctly

---

---

## Quick Reference

### Helper Functions Needed

You'll need a UUID generator function. Here are options:

**Node.js (crypto module):**

```javascript
import { randomUUID } from "crypto";
const correlationId = randomUUID();
```

**Browser (crypto API):**

```javascript
const correlationId = crypto.randomUUID();
```

**Or use a library:**

```javascript
import { v4 as uuidv4 } from "uuid";
const correlationId = uuidv4();
```

### Complete Field Summary

**Required Customer Fields (9 total):**

1. `customerName` - String, min 2 chars
2. `airtelNumber` - String, 10-12 digits
3. `alternateNumber` - String, 10-12 digits
4. `email` - String, valid email format
5. `preferredPackage` - String, "standard" or "premium"
6. `installationTown` - String, one of 52 towns
7. `deliveryLandmark` - String, min 5 chars
8. `installationLocation` - String, location within town
9. `visitDate` - String, format `M/d/yyyy`
10. `visitTime` - String, format `h:mm AM/PM`

**Auto-filled Internal Fields (7 total):**

1. `agentType` - "Enterprise"
2. `enterpriseCP` - "WAM APPLICATIONS"
3. `agentName` - From authenticated agent
4. `agentMobile` - From authenticated agent
5. `leadType` - "Confirmed"
6. `connectionType` - "SmartConnect (5G ODU)"
7. `totalUnitsRequired` - "1"

### API Endpoint Format

```
https://forms.guest.usercontent.microsoft/formapi/api/{tenantId}/users/{userId}/forms(%27{formId}%27)/responses
```

Where:

- `{tenantId}` = `16c73727-979c-4d82-b3a7-eb6a2fddfe57`
- `{userId}` = `7726dd57-48bb-4c89-9e1e-f2669916f1fe`
- `{formId}` = `JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UQjc4M0wwWU9HRTJPRjMxWlc5QjRLOUhaMC4u`
- `%27` = URL-encoded single quote (`'`)

---

**Last Updated:** 2025-01-27  
**Version:** 1.0
