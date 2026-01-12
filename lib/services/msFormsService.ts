/**
 * Microsoft Forms Integration Service
 * Handles token fetching, payload building, and submission to Microsoft Forms API
 * 
 * Note: Token fetching requires server-side execution due to cookie handling.
 * This service should be called from a Supabase Edge Function or backend service.
 */

import {
  formatPhone,
  normalizeTownForMSForms,
  convertTo24Hour,
  getPackageName,
  formatInstallationLocation,
  generateUUID,
} from "../utils/customerRegistration";

// Microsoft Forms Configuration
const MS_FORMS_FORM_ID =
  process.env.EXPO_PUBLIC_MS_FORMS_FORM_ID ||
  "JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UQjc4M0wwWU9HRTJPRjMxWlc5QjRLOUhaMC4u";
const MS_FORMS_TENANT_ID =
  process.env.EXPO_PUBLIC_MS_FORMS_TENANT_ID ||
  "16c73727-979c-4d82-b3a7-eb6a2fddfe57";
const MS_FORMS_USER_ID =
  process.env.EXPO_PUBLIC_MS_FORMS_USER_ID ||
  "7726dd57-48bb-4c89-9e1e-f2669916f1fe";
const MS_FORMS_RESPONSE_PAGE_URL =
  process.env.EXPO_PUBLIC_MS_FORMS_RESPONSE_PAGE_URL ||
  "https://forms.cloud.microsoft/";

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
  optionalField: "r1e3b5a91acaa465b8aab76bab2cad94a",
};

export interface MSTokens {
  requestVerificationToken: string;
  cookieString: string;
  muid: string;
  userSessionId: string;
  userId: string;
  tenantId: string;
}

export interface CustomerRegistrationData {
  customerName: string;
  airtelNumber: string;
  alternateNumber: string;
  email: string;
  preferredPackage: "standard" | "premium";
  installationTown: string;
  deliveryLandmark: string;
  installationLocation: string;
  visitDate: string; // M/d/yyyy format
  visitTime: string; // h:mm AM/PM format
}

export interface AgentData {
  name: string;
  mobile: string; // Agent's phone number
}

export interface MSFormsPayload {
  startDate: string;
  submitDate: string;
  answers: string; // JSON stringified
  correlationId: string;
}

export interface MSFormsSubmissionResult {
  success: boolean;
  responseId?: string;
  submitDate?: string;
  responder?: any;
  error?: string;
}

/**
 * Fetches Microsoft Forms tokens and cookies
 * NOTE: This requires server-side execution (Supabase Edge Function or backend)
 */
export async function fetchMSTokens(
  responsePageUrl: string = MS_FORMS_RESPONSE_PAGE_URL
): Promise<MSTokens> {
  const tokenResponse = await fetch(responsePageUrl, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br, zstd",
    },
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to fetch tokens: ${tokenResponse.status}`);
  }

  // Extract cookies from Set-Cookie headers
  // React Native fetch doesn't support getSetCookie(), so we need to parse manually
  const setCookieHeader = tokenResponse.headers.get("set-cookie") || "";
  const setCookieHeaders = setCookieHeader ? setCookieHeader.split(", ") : [];
  const cookies: string[] = [];
  let formsSessionId = "";
  let requestVerificationToken = "";
  let muid = "";
  let msalCacheEncryption = "";

  // Also check for multiple Set-Cookie headers (some servers send them separately)
  const allSetCookieHeaders: string[] = [];
  tokenResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      allSetCookieHeaders.push(value);
    }
  });

  // Combine all Set-Cookie headers
  const allCookies = allSetCookieHeaders.length > 0 ? allSetCookieHeaders : setCookieHeaders;

  for (const cookie of allCookies) {
    const cookiePair = cookie.split(";")[0].trim();
    if (cookiePair) {
      cookies.push(cookiePair);
    }

    if (cookie.includes("FormsWebSessionId=")) {
      const match = cookie.match(/FormsWebSessionId=([^;]+)/);
      if (match) formsSessionId = match[1];
    }
    if (cookie.includes("__RequestVerificationToken=")) {
      const match = cookie.match(/__RequestVerificationToken=([^;]+)/);
      if (match) requestVerificationToken = match[1];
    }
    if (cookie.includes("MUID=")) {
      const match = cookie.match(/MUID=([^;]+)/);
      if (match) muid = match[1];
    }
    if (cookie.includes("msal.cache.encryption=")) {
      const match = cookie.match(/msal\.cache\.encryption=([^;]+)/);
      if (match) msalCacheEncryption = match[1];
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

  // Extract x-usersessionid from response headers or generate UUID
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

/**
 * Builds Microsoft Forms payload from customer data
 */
export function buildMSFormsPayload(
  customerData: CustomerRegistrationData,
  agentData: AgentData
): MSFormsPayload {
  const startDate = new Date().toISOString();
  const submitDate = new Date().toISOString();
  const correlationId = generateUUID();

  // Format and normalize data
  const normalizedTown = normalizeTownForMSForms(
    customerData.installationTown
  );
  const installationLocation = formatInstallationLocation(
    customerData.installationTown,
    customerData.installationLocation
  );

  const formattedAirtelNumber = formatPhone(customerData.airtelNumber);
  const formattedAlternateNumber = formatPhone(customerData.alternateNumber);
  const formattedAgentMobile = formatPhone(agentData.mobile);

  const fullPackageName = getPackageName(customerData.preferredPackage);
  const time24Hour = convertTo24Hour(customerData.visitTime);

  // Internal defaults
  const internalDefaults = {
    agentType: "Enterprise",
    enterpriseCP: "WAM APPLICATIONS",
    agentName: agentData.name,
    agentMobile: formattedAgentMobile,
    leadType: "Confirmed",
    connectionType: "SmartConnect (5G ODU)",
    totalUnitsRequired: "1",
  };

  // Build answers array - ORDER IS CRITICAL
  const answers = [
    {
      questionId: QUESTION_IDS.agentType,
      answer1: internalDefaults.agentType,
    },
    {
      questionId: QUESTION_IDS.enterpriseCP,
      answer1: internalDefaults.enterpriseCP,
    },
    {
      questionId: QUESTION_IDS.agentName,
      answer1: internalDefaults.agentName,
    },
    {
      questionId: QUESTION_IDS.agentMobile,
      answer1: internalDefaults.agentMobile,
    },
    {
      questionId: QUESTION_IDS.leadType,
      answer1: internalDefaults.leadType,
    },
    {
      questionId: QUESTION_IDS.totalUnitsRequired,
      answer1: internalDefaults.totalUnitsRequired,
    },
    {
      questionId: QUESTION_IDS.connectionType,
      answer1: internalDefaults.connectionType,
    },
    {
      questionId: QUESTION_IDS.customerName,
      answer1: customerData.customerName,
    },
    {
      questionId: QUESTION_IDS.airtelNumber,
      answer1: formattedAirtelNumber,
    },
    {
      questionId: QUESTION_IDS.alternateNumber,
      answer1: formattedAlternateNumber,
    },
    {
      questionId: QUESTION_IDS.email,
      answer1: customerData.email,
    },
    {
      questionId: QUESTION_IDS.preferredPackage,
      answer1: fullPackageName,
    },
    {
      questionId: QUESTION_IDS.visitDate,
      answer1: customerData.visitDate, // Format: M/d/yyyy
    },
    {
      questionId: QUESTION_IDS.visitTime,
      answer1: time24Hour, // Format: HH:mm (24-hour)
    },
    {
      questionId: QUESTION_IDS.deliveryLandmark,
      answer1: customerData.deliveryLandmark,
    },
    {
      questionId: QUESTION_IDS.installationTown,
      answer1: normalizedTown, // e.g., "HOMABAY" not "Homa Bay"
    },
    {
      questionId: QUESTION_IDS.installationLocation,
      answer1: installationLocation, // e.g., "HOMABAY - Kangemi"
    },
    // Optional field - only include if it exists in the form
    // If the form doesn't have this field, remove this entry
    // {
    //   questionId: QUESTION_IDS.optionalField,
    //   answer1: "",
    // },
  ];

  return {
    startDate,
    submitDate,
    answers: JSON.stringify(answers), // Must be stringified!
    correlationId,
  };
}

/**
 * Submits customer registration to Microsoft Forms
 */
export async function submitToMSForms(
  formId: string,
  tenantId: string,
  userId: string,
  payload: MSFormsPayload,
  tokens: MSTokens
): Promise<MSFormsSubmissionResult> {
  // URL encode the form ID - note: single quotes in URL are encoded as %27
  const encodedFormId = encodeURIComponent(formId);
  const msFormsUrl = `https://forms.guest.usercontent.microsoft/formapi/api/${tenantId}/users/${userId}/forms(%27${encodedFormId}%27)/responses`;

  // Parse answers from string back to array
  const answersArray = JSON.parse(payload.answers);
  const requestBody = {
    startDate: payload.startDate,
    submitDate: payload.submitDate,
    answers: answersArray,
  };

  console.log("=== MS Forms API Request ===");
  console.log("URL:", msFormsUrl);
  console.log("Request Body (full):", JSON.stringify(requestBody, null, 2));
  console.log("Request Body (summary):", {
    startDate: requestBody.startDate,
    submitDate: requestBody.submitDate,
    answersCount: requestBody.answers.length,
    firstAnswer: requestBody.answers[0],
    lastAnswer: requestBody.answers[requestBody.answers.length - 1],
  });
  console.log("Token Status:", {
    hasToken: !!tokens.requestVerificationToken,
    tokenLength: tokens.requestVerificationToken?.length || 0,
    hasCookies: !!tokens.cookieString,
    cookieLength: tokens.cookieString?.length || 0,
    hasMuid: !!tokens.muid,
    userSessionId: tokens.userSessionId,
  });

  const response = await fetch(msFormsUrl, {
    method: "POST",
    headers: {
      __requestverificationtoken: tokens.requestVerificationToken || "",
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
      Cookie: tokens.cookieString || "",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("Response Status:", response.status);
  console.log("Response Status Text:", response.statusText);
  console.log("Response Headers:", Object.fromEntries(response.headers.entries()));

  let responseData;
  try {
    const responseText = await response.text();
    console.log("Response Body (raw):", responseText.substring(0, 1000));
    
    try {
      responseData = JSON.parse(responseText);
      console.log("Response Data (parsed):", JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      throw new Error(
        `Microsoft Forms submission failed: ${
          response.status
        } - ${responseText.substring(0, 500)}`
      );
    }
  } catch (jsonError: any) {
    console.error("Error reading response:", jsonError);
    throw new Error(
      `Microsoft Forms submission failed: ${
        response.status
      } - ${jsonError.message}`
    );
  }

  if (!response.ok) {
    console.error("=== MS Forms API Error Response ===");
    console.error("Status:", response.status);
    console.error("Response Data:", JSON.stringify(responseData, null, 2));
    
    // Check if form is closed
    if (
      response.status === 403 &&
      responseData?.error?.message?.includes("closed")
    ) {
      console.error("❌ Form is closed");
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
  console.log("=== MS Forms API Success ===");
  const responseId = responseData?.id || null;
  console.log("✅ Response ID:", responseId);
  console.log("✅ Submit Date:", responseData?.submitDate);
  console.log("✅ Responder:", responseData?.responder);
  console.log("Full Success Response:", JSON.stringify(responseData, null, 2));
  
  return {
    success: true,
    responseId,
    submitDate: responseData?.submitDate,
    responder: responseData?.responder,
  };
}

/**
 * Complete customer registration flow
 * NOTE: Token fetching should be done server-side (Supabase Edge Function)
 * This function is a client-side wrapper that calls the backend
 */
export async function registerCustomerToMSForms(
  customerData: CustomerRegistrationData,
  agentData: AgentData
): Promise<MSFormsSubmissionResult> {
  try {
    console.log("=== MS Forms Service: Starting Registration ===");
    
    // Step 1: Fetch tokens (should be done server-side)
    console.log("Step 1: Fetching MS Forms tokens...");
    const tokens = await fetchMSTokens();
    console.log("✅ Tokens fetched:", {
      hasToken: !!tokens.requestVerificationToken,
      userId: tokens.userId,
      tenantId: tokens.tenantId,
      hasCookies: !!tokens.cookieString,
    });

    // Step 2: Build payload
    console.log("Step 2: Building MS Forms payload...");
    const payload = buildMSFormsPayload(customerData, agentData);
    console.log("✅ Payload built:", {
      correlationId: payload.correlationId,
      startDate: payload.startDate,
      submitDate: payload.submitDate,
      answersLength: payload.answers?.length || 0,
    });
    console.log("Payload answers (first 500 chars):", payload.answers?.substring(0, 500));

    // Step 3: Submit to MS Forms
    console.log("Step 3: Submitting to MS Forms API...");
    console.log("Form ID:", MS_FORMS_FORM_ID);
    console.log("Tenant ID:", tokens.tenantId);
    console.log("User ID:", tokens.userId);
    
    const result = await submitToMSForms(
      MS_FORMS_FORM_ID,
      tokens.tenantId,
      tokens.userId,
      payload,
      tokens
    );

    console.log("✅ MS Forms submission completed:", {
      success: result.success,
      responseId: result.responseId,
      submitDate: result.submitDate,
    });

    return result;
  } catch (error: any) {
    console.error("=== MS Forms Service: Registration Error ===");
    console.error("Error Type:", error?.constructor?.name);
    console.error("Error Message:", error?.message);
    console.error("Error Stack:", error?.stack);
    console.error("Full Error Object:", error);
    
    return {
      success: false,
      error: error.message || "Failed to register customer",
    };
  }
}

