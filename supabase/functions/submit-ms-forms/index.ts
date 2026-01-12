// Supabase Edge Function: Submit to Microsoft Forms
// This function handles Microsoft Forms submission with proper cookie extraction
// which React Native cannot do due to Set-Cookie header limitations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Helper function to clean environment variables (trim whitespace, remove comments)
function cleanEnvVar(value: string | undefined, defaultValue: string): string {
  if (!value) return defaultValue;
  // Trim whitespace and remove anything after # (comments)
  const cleaned = value.split('#')[0].trim();
  return cleaned || defaultValue;
}

// Microsoft Forms Configuration (set as Edge Function secrets)
const MS_FORMS_FORM_ID = cleanEnvVar(
  Deno.env.get("MS_FORMS_FORM_ID"),
  "JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UQjc4M0wwWU9HRTJPRjMxWlc5QjRLOUhaMC4u"
);
const MS_FORMS_TENANT_ID = cleanEnvVar(
  Deno.env.get("MS_FORMS_TENANT_ID"),
  "16c73727-979c-4d82-b3a7-eb6a2fddfe57"
);
const MS_FORMS_USER_ID = cleanEnvVar(
  Deno.env.get("MS_FORMS_USER_ID"),
  "7726dd57-48bb-4c89-9e1e-f2669916f1fe"
);
// Response page URL (optional - will be constructed from form ID if not provided)
const MS_FORMS_RESPONSE_PAGE_URL = cleanEnvVar(
  Deno.env.get("MS_FORMS_RESPONSE_PAGE_URL"),
  `https://forms.office.com/pages/responsepage.aspx?id=${MS_FORMS_FORM_ID}&route=shorturl`
);

// Question IDs for Microsoft Forms
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
  optionalField: "r1e3b5a91acaa465b8aab76bab2cad94a", // Optional field (can be null)
};

// Helper functions
function normalizeTownForMSForms(town: string | undefined | null): string {
  if (!town) return "";
  return town.replace(/\s+/g, "").toUpperCase();
}

function formatPhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Match Next.js logic exactly
  if (digits.startsWith("254") && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `254${digits.substring(1)}`;
  }
  if (digits.length >= 9) {
    return `254${digits}`;
  }
  return digits;
}

function convertTo24Hour(time12h: string | undefined | null): string {
  if (!time12h) return "";
  const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12h;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  else if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function getPackageName(pkg: "standard" | "premium" | string | undefined | null): string {
  if (!pkg) return "";
  const map: Record<string, string> = {
    standard: "5G _15Mbps_30days at Ksh.2999",
    premium: "5G _30Mbps_30days at Ksh.3999",
  };
  return map[pkg.toLowerCase()] || pkg;
}

function formatInstallationLocation(town: string | undefined | null, location: string | undefined | null): string {
  if (!location) return "";
  const normalizedTown = normalizeTownForMSForms(town);
  return normalizedTown ? `${normalizedTown} - ${location}` : location;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Parse request body - client sends { customerData: {...}, agentData: {...} }
    const body = await req.json();
    
    // Log raw body structure for debugging
    console.log("📥 Raw request body keys:", Object.keys(body));
    console.log("📥 Has customerData:", !!body.customerData);
    console.log("📥 Has agentData:", !!body.agentData);
    
    // Extract from nested structure (client sends { customerData: {...}, agentData: {...} })
    const customerData = body.customerData || body;
    const agentData = body.agentData || body;
    
    // Log customerData structure
    console.log("📥 customerData keys:", customerData ? Object.keys(customerData) : "null");
    console.log("📥 customerData.installationTown:", customerData?.installationTown);

    const {
      customerName,
      airtelNumber,
      alternateNumber,
      email,
      preferredPackage,
      installationTown,
      deliveryLandmark,
      installationLocation,
      visitDate,
      visitTime,
    } = customerData;
    
    const {
      name: agentName,
      mobile: agentMobile,
    } = agentData;

    console.log("📥 Extracted values:", {
      customerName,
      email,
      preferredPackage,
      installationTown,
      hasInstallationTown: !!installationTown,
    });

    // Validate required fields
    const requiredFields = [
      { name: "customerName", value: customerName },
      { name: "airtelNumber", value: airtelNumber },
      { name: "email", value: email },
      { name: "preferredPackage", value: preferredPackage },
      { name: "installationTown", value: installationTown },
      { name: "visitDate", value: visitDate },
      { name: "visitTime", value: visitTime },
      { name: "agentName", value: agentName },
      { name: "agentMobile", value: agentMobile },
    ];

    const missingFields = requiredFields.filter(field => !field.value);
    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields.map(f => f.name));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required fields: ${missingFields.map(f => f.name).join(", ")}`,
          details: missingFields,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }


    // Step 1: Fetch tokens and cookies from Microsoft Forms
    console.log("🔍 Fetching tokens from:", MS_FORMS_RESPONSE_PAGE_URL);
    
    const tokenResponse = await fetch(MS_FORMS_RESPONSE_PAGE_URL, {
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

    // Extract cookies (this works in Edge Functions!)
    const cookies: string[] = [];
    let formsSessionId = "";
    let requestVerificationToken = "";
    let muid = "";
    let userSessionId = tokenResponse.headers.get("x-usersessionid") || "";

    // Get Set-Cookie headers (Deno/Edge Functions can access these!)
    const setCookieHeaders = tokenResponse.headers.getSetCookie();
    
    console.log("🍪 Raw Set-Cookie headers:", {
      count: setCookieHeaders.length,
      headers: setCookieHeaders.map(c => c.substring(0, 100)),
    });
    
    for (const cookie of setCookieHeaders) {
      const cookiePair = cookie.split(";")[0].trim();
      if (cookiePair) {
        cookies.push(cookiePair);
        
        if (cookiePair.startsWith("FormsWebSessionId=")) {
          formsSessionId = cookiePair.split("FormsWebSessionId=")[1] || "";
          console.log("✅ Found FormsWebSessionId");
        }
        if (cookiePair.startsWith("__RequestVerificationToken=")) {
          requestVerificationToken = cookiePair.split("__RequestVerificationToken=")[1] || "";
          console.log("✅ Found __RequestVerificationToken in cookie");
        }
        if (cookiePair.startsWith("MUID=")) {
          muid = cookiePair.split("MUID=")[1] || "";
          console.log("✅ Found MUID");
        }
      }
    }

    const cookieString = cookies.join("; ");

    // Log cookie details for debugging
    console.log("🍪 Cookie Details:", {
      cookieCount: cookies.length,
      cookieString: cookieString?.substring(0, 200),
      hasFormsWebSessionId: !!formsSessionId,
      formsSessionId: formsSessionId?.substring(0, 30) + "...",
      hasMuid: !!muid,
      muid: muid?.substring(0, 30) + "...",
      allCookies: cookies.map(c => c.substring(0, 50)),
    });

    // Extract token from HTML (try multiple patterns for robustness)
    const html = await tokenResponse.text();
    
    // Pattern 1: Standard HTML input
    let tokenMatch = html.match(/name="__RequestVerificationToken"\s+value="([^"]+)"/);
    
    // Pattern 2: Single quotes
    if (!tokenMatch) {
      tokenMatch = html.match(/name='__RequestVerificationToken'\s+value='([^']+)'/);
    }
    
    // Pattern 3: JavaScript/JSON format
    if (!tokenMatch) {
      tokenMatch = html.match(/"__RequestVerificationToken"\s*:\s*"([^"]+)"/);
    }
    
    // Pattern 4: antiForgeryToken in JavaScript
    if (!tokenMatch) {
      tokenMatch = html.match(/antiForgeryToken["']?\s*[:=]\s*["']([A-Za-z0-9_\-+/=]{20,})["']/);
    }
    
    if (tokenMatch) {
      requestVerificationToken = tokenMatch[1];
    }

    if (!requestVerificationToken) {
      throw new Error("Failed to extract verification token from HTML");
    }

    // Extract user and tenant IDs from HTML (like Next.js does)
    // These might be in the HTML or we use the configured values
    const userIdMatch = html.match(/"userId":"([^"]+)"/);
    const tenantMatch = html.match(/"tenantId":"([^"]+)"/);
    
    // Use extracted IDs if found, otherwise use configured values
    const extractedUserId = userIdMatch ? userIdMatch[1] : MS_FORMS_USER_ID;
    const extractedTenantId = tenantMatch ? tenantMatch[1] : MS_FORMS_TENANT_ID;
    
    console.log("🔍 Extracted IDs from HTML:", {
      userIdFromHtml: userIdMatch ? userIdMatch[1] : "not found",
      tenantIdFromHtml: tenantMatch ? tenantMatch[1] : "not found",
      usingUserId: extractedUserId,
      usingTenantId: extractedTenantId,
    });

    // ⚠️ CRITICAL: FormsWebSessionId is required for Microsoft Forms
    if (!formsSessionId) {
      console.warn("⚠️ WARNING: FormsWebSessionId cookie not found!");
      console.warn("⚠️ This may cause submission to fail");
      console.warn("⚠️ Cookies found:", cookies.map(c => c.split("=")[0]));
    }

    console.log("✅ Tokens extracted:", {
      hasToken: !!requestVerificationToken,
      tokenLength: requestVerificationToken.length,
      hasCookies: !!cookieString,
      cookieCount: cookies.length,
      hasFormsWebSessionId: !!formsSessionId,
      hasMuid: !!muid,
      userSessionId: userSessionId || "generated",
      userId: extractedUserId,
      tenantId: extractedTenantId,
    });

    // Step 2: Build payload
    const startDate = new Date().toISOString();
    const submitDate = new Date().toISOString();
    const correlationId = generateUUID();

    const normalizedTown = normalizeTownForMSForms(installationTown);
    const installationLocationFormatted = formatInstallationLocation(
      installationTown,
      installationLocation
    );
    const formattedAirtelNumber = formatPhone(airtelNumber);
    const formattedAlternateNumber = formatPhone(alternateNumber);
    const formattedAgentMobile = formatPhone(agentMobile);
    const fullPackageName = getPackageName(preferredPackage as "standard" | "premium");
    const time24Hour = convertTo24Hour(visitTime);

    // ⚠️ CRITICAL: Convert visitDate from M/d/yyyy (React Native format) to YYYY-MM-DD (Microsoft Forms format)
    // React Native sends: "1/13/2026" -> Microsoft Forms expects: "2026-01-13"
    let formattedVisitDate = visitDate;
    try {
      const [month, day, year] = visitDate.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      formattedVisitDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      console.log("📅 Date conversion:", { input: visitDate, output: formattedVisitDate });
    } catch (e) {
      console.warn("⚠️ Failed to convert date format, using original:", visitDate);
    }

    if (!userSessionId) {
      userSessionId = generateUUID();
    }

    // Ensure all required answer values are strings (not null/undefined)
    // Microsoft Forms requires all non-optional answers to be strings
    const safeString = (value: any): string => {
      if (value === null || value === undefined) return "";
      return String(value);
    };

    const answers = [
      { questionId: QUESTION_IDS.agentType, answer1: "Enterprise" },
      { questionId: QUESTION_IDS.enterpriseCP, answer1: "WAM APPLICATIONS" },
      { questionId: QUESTION_IDS.agentName, answer1: safeString(agentName) },
      { questionId: QUESTION_IDS.agentMobile, answer1: safeString(formattedAgentMobile) },
      { questionId: QUESTION_IDS.leadType, answer1: "Confirmed" },
      { questionId: QUESTION_IDS.totalUnitsRequired, answer1: "1" },
      { questionId: QUESTION_IDS.connectionType, answer1: "SmartConnect (5G ODU)" },
      { questionId: QUESTION_IDS.customerName, answer1: safeString(customerName) },
      { questionId: QUESTION_IDS.airtelNumber, answer1: safeString(formattedAirtelNumber) },
      { questionId: QUESTION_IDS.alternateNumber, answer1: safeString(formattedAlternateNumber) },
      { questionId: QUESTION_IDS.email, answer1: safeString(email) },
      { questionId: QUESTION_IDS.preferredPackage, answer1: safeString(fullPackageName) },
      { questionId: QUESTION_IDS.visitDate, answer1: safeString(formattedVisitDate) }, // YYYY-MM-DD format
      { questionId: QUESTION_IDS.visitTime, answer1: safeString(time24Hour) },
      { questionId: QUESTION_IDS.deliveryLandmark, answer1: safeString(deliveryLandmark) },
      { questionId: QUESTION_IDS.installationTown, answer1: safeString(normalizedTown) },
      { questionId: QUESTION_IDS.installationLocation, answer1: safeString(installationLocationFormatted) },
      { questionId: QUESTION_IDS.optionalField, answer1: null }, // Optional field - set to null as per form structure
    ];

    // Log answer values for debugging
    console.log("📋 Answer values being sent:", {
      agentName: safeString(agentName),
      agentMobile: safeString(formattedAgentMobile),
      customerName: safeString(customerName),
      airtelNumber: safeString(formattedAirtelNumber),
      alternateNumber: safeString(formattedAlternateNumber),
      email: safeString(email),
      preferredPackage: safeString(fullPackageName),
      visitDate: safeString(visitDate),
      visitTime: safeString(time24Hour),
      deliveryLandmark: safeString(deliveryLandmark),
      installationTown: safeString(normalizedTown),
      installationLocation: safeString(installationLocationFormatted),
    });

    // Validate that required answers are not empty (except optional field)
    const requiredAnswers = answers.slice(0, -1); // All except the last (optional) field
    const emptyAnswers = requiredAnswers.filter(a => !a.answer1 || a.answer1 === "");
    
    if (emptyAnswers.length > 0) {
      console.error("❌ Some required answers are empty:", emptyAnswers.map(a => a.questionId));
      // Don't throw - just log, as some fields might legitimately be empty
    }

    // Step 3: Submit to Microsoft Forms
    // ⚠️ VALIDATION: User ID and Tenant ID must be GUIDs
    // Form ID format: JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UQjc4M0wwWU9HRTJPRjMxWlc5QjRLOUhaMC4u
    // User ID format: 7726dd57-48bb-4c89-9e1e-f2669916f1fe (GUID with dashes)
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Validate extracted or configured IDs
    const finalUserId = extractedUserId;
    const finalTenantId = extractedTenantId;
    
    if (!guidPattern.test(finalUserId)) {
      console.error("❌ CRITICAL ERROR: User ID is not a valid GUID!");
      console.error("❌ Current value:", JSON.stringify(finalUserId));
      console.error("❌ Expected format: 7726dd57-48bb-4c89-9e1e-f2669916f1fe");
      console.error("❌ Common issues:");
      console.error("   - Form ID was set instead of user ID");
      console.error("   - Comment text was included (e.g., 'GUID # comment')");
      console.error("   - Extra whitespace or characters");
      throw new Error(
        `User ID must be a GUID (e.g., 7726dd57-48bb-4c89-9e1e-f2669916f1fe), but got: ${JSON.stringify(finalUserId)}. ` +
        `Please check your Supabase Edge Function secrets - the value should ONLY be the GUID, no comments or extra text.`
      );
    }
    
    if (!guidPattern.test(finalTenantId)) {
      console.error("❌ CRITICAL ERROR: Tenant ID is not a valid GUID!");
      console.error("❌ Current value:", JSON.stringify(finalTenantId));
      throw new Error(
        `Tenant ID must be a GUID, but got: ${JSON.stringify(finalTenantId)}. ` +
        `Please check your Supabase Edge Function secrets - the value should ONLY be the GUID, no comments or extra text.`
      );
    }
    
    console.log("✅ Validated IDs:", {
      formId: MS_FORMS_FORM_ID.substring(0, 30) + "...",
      tenantId: finalTenantId,
      userId: finalUserId,
    });
    
    const encodedFormId = encodeURIComponent(MS_FORMS_FORM_ID);
    const msFormsUrl = `https://forms.guest.usercontent.microsoft/formapi/api/${finalTenantId}/users/${finalUserId}/forms(%27${encodedFormId}%27)/responses`;

    // ⚠️ CRITICAL: answers must be a STRINGIFIED STRING (as per Next.js working code)
    // The Next.js logs show: "answers": "[{...}]" - it's a JSON string, not an array!
    const answersString = JSON.stringify(answers);
    console.log("🔍 Answers stringification check:", {
      answersIsArray: Array.isArray(answers),
      answersStringType: typeof answersString,
      answersStringIsString: typeof answersString === "string",
      answersStringPreview: answersString.substring(0, 100),
    });

    const requestBody = {
      startDate,
      submitDate,
      answers: answersString, // Must be stringified string!
    };

    // Log the exact request body structure
    const requestBodyString = JSON.stringify(requestBody);
    
    // Verify the stringified body contains answers as a string
    const parsedBody = JSON.parse(requestBodyString);
    console.log("🔍 Final request body verification:", {
      answersTypeInBody: typeof parsedBody.answers,
      answersIsStringInBody: typeof parsedBody.answers === "string",
      answersPreviewInBody: typeof parsedBody.answers === "string" ? parsedBody.answers.substring(0, 100) : "NOT A STRING",
    });
    
    console.log("=".repeat(80));
    console.log("📤 MICROSOFT FORMS REQUEST - COMPLETE DETAILS");
    console.log("=".repeat(80));
    console.log("🔗 URL:", msFormsUrl);
    console.log("📋 METHOD: POST");
    console.log("");
    console.log("📦 REQUEST BODY (COMPLETE):");
    console.log(JSON.stringify(requestBody, null, 2));
    console.log("");
    console.log("📦 REQUEST BODY (STRINGIFIED - AS SENT):");
    console.log(requestBodyString);
    console.log("");
    console.log("📋 REQUEST BODY SUMMARY:");
    console.log({
      startDate: requestBody.startDate,
      submitDate: requestBody.submitDate,
      answersType: typeof requestBody.answers,
      answersIsString: typeof requestBody.answers === "string",
      answersLength: requestBody.answers?.length || 0,
      answersCount: answers.length,
    });

    // Verify answers is valid JSON string
    try {
      const parsedAnswers = JSON.parse(requestBody.answers);
      console.log("✅ Answers string is valid JSON:", {
        isArray: Array.isArray(parsedAnswers),
        length: Array.isArray(parsedAnswers) ? parsedAnswers.length : 0,
        firstItem: Array.isArray(parsedAnswers) && parsedAnswers.length > 0 ? parsedAnswers[0] : null,
        lastItem: Array.isArray(parsedAnswers) && parsedAnswers.length > 0 ? parsedAnswers[parsedAnswers.length - 1] : null,
      });
      
      // Log all answers to see if any have null/undefined values (except optional field)
      const answersWithIssues = parsedAnswers
        .map((a: any, i: number) => ({ index: i, questionId: a.questionId, answer1: a.answer1, type: typeof a.answer1, isNull: a.answer1 === null, isUndefined: a.answer1 === undefined }))
        .filter((a: any) => a.isNull || a.isUndefined || a.answer1 === "");
      
      if (answersWithIssues.length > 0) {
        console.warn("⚠️ Answers with potential issues:", answersWithIssues);
      }
    } catch (e) {
      console.error("❌ Answers string is NOT valid JSON:", e);
      throw new Error("Answers is not a valid JSON string");
    }
    
    // Prepare headers
    const requestHeaders = {
      __requestverificationtoken: requestVerificationToken,
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
      "x-correlationid": correlationId,
      "x-ms-form-muid": muid || "",
      "x-ms-form-request-ring": "business",
      "x-ms-form-request-source": "ms-formweb",
      "x-usersessionid": userSessionId,
      Cookie: cookieString,
    };

    console.log("📋 REQUEST HEADERS (COMPLETE):");
    console.log(JSON.stringify(requestHeaders, null, 2));
    console.log("");
    console.log("📋 REQUEST HEADERS SUMMARY:");
    console.log({
      hasToken: !!requestVerificationToken,
      tokenLength: requestVerificationToken?.length || 0,
      tokenPreview: requestVerificationToken ? `${requestVerificationToken.substring(0, 20)}...` : "none",
      hasCookies: !!cookieString,
      cookieCount: cookieString?.split(";").length || 0,
      cookieNames: cookieString ? cookieString.split(";").map(c => c.split("=")[0].trim()).join(", ") : "none",
      hasMuid: !!muid,
      muid: muid || "none",
      correlationId,
      userSessionId,
    });
    console.log("=".repeat(80));
    console.log("🚀 SENDING REQUEST TO MICROSOFT FORMS...");
    console.log("=".repeat(80));
    console.log("");

    const response = await fetch(msFormsUrl, {
      method: "POST",
      headers: requestHeaders,
      body: requestBodyString,
    });

    console.log("=".repeat(80));
    console.log("📥 MICROSOFT FORMS RESPONSE");
    console.log("=".repeat(80));
    console.log("📊 Response Status:", response.status, response.statusText);
    console.log("");
    
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log("📋 RESPONSE HEADERS (COMPLETE):");
    console.log(JSON.stringify(responseHeaders, null, 2));
    console.log("");

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("❌ RESPONSE ERROR - STATUS:", response.status);
      console.error("❌ RESPONSE ERROR - STATUS TEXT:", response.statusText);
      console.error("");
      console.error("📋 RESPONSE BODY (COMPLETE):");
      console.error(responseText);
      console.error("");
      
      // Try to parse as JSON for better readability
      try {
        const errorData = JSON.parse(responseText);
        console.error("📋 RESPONSE BODY (PARSED JSON):");
        console.error(JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error("📋 RESPONSE BODY (RAW TEXT - not valid JSON)");
      }
      
      console.error("");
      console.error("=".repeat(80));
      console.error("❌ SUBMISSION FAILED");
      console.error("=".repeat(80));
      
      throw new Error(`Microsoft Forms submission failed: ${response.status} - ${responseText}`);
    }

    // Success response
    console.log("✅ RESPONSE SUCCESS - STATUS:", response.status);
    console.log("");
    console.log("📋 RESPONSE BODY (COMPLETE):");
    console.log(responseText);
    console.log("");
    
    // Try to parse as JSON for better readability
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("📋 RESPONSE BODY (PARSED JSON):");
      console.log(JSON.stringify(responseData, null, 2));
      console.log("");
      console.log("✅ RESPONSE SUMMARY:");
      console.log({
        success: true,
        responseId: responseData?.id,
        submitDate: responseData?.submitDate,
        responder: responseData?.responder,
      });
    } catch (e) {
      console.warn("⚠️ Response is not valid JSON, showing raw text above");
      responseData = { raw: responseText };
    }
    
    console.log("");
    console.log("=".repeat(80));
    console.log("✅ SUBMISSION SUCCESSFUL");
    console.log("=".repeat(80));

    return new Response(
      JSON.stringify({
        success: true,
        responseId: responseData?.id,
        submitDate: responseData?.submitDate,
        responder: responseData?.responder,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("❌ Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to submit to Microsoft Forms",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

