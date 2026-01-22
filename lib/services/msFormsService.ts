/**
 * Microsoft Forms Integration Service
 * Handles token fetching, payload building, and submission to Microsoft Forms API
 * 
 * ⚠️ UPDATED: Now uses Supabase Edge Function for cookie handling
 * 
 * React Native fetch cannot extract Set-Cookie headers, which Microsoft Forms requires.
 * The solution is to use a Supabase Edge Function (submit-ms-forms) that:
 * - Properly extracts cookies from Microsoft Forms response
 * - Submits the request with cookies included
 * - Returns the result to the client
 * 
 * The client-side functions (fetchMSTokens, submitToMSForms) are kept for reference
 * but registerCustomerToMSForms() now calls the Edge Function instead.
 * 
 * See SUPABASE_EDGE_FUNCTION_SETUP.md for deployment instructions.
 */

import {
  convertTo24Hour,
  formatInstallationLocation,
  formatPhone,
  generateUUID,
  getPackageName,
  normalizeTownForMSForms,
} from "../utils/customerRegistration";

// Microsoft Forms Configuration
const MS_FORMS_FORM_ID =
  process.env.EXPO_PUBLIC_MS_FORMS_FORM_ID ||
  "JzfHFpyXgk2zp-tqL93-V1fdJne7SIlMnh7yZpkW8f5UNE5JMkcyMEtYSDhZUEdZUVoyUDZBSlA1Wi4u";
const MS_FORMS_TENANT_ID =
  process.env.EXPO_PUBLIC_MS_FORMS_TENANT_ID ||
  "16c73727-979c-4d82-b3a7-eb6a2fddfe57";
const MS_FORMS_USER_ID =
  process.env.EXPO_PUBLIC_MS_FORMS_USER_ID ||
  "7726dd57-48bb-4c89-9e1e-f2669916f1fe";

// ⚠️ FIX: Build the correct response page URL with form ID
function getMSFormsResponsePageUrl(): string {
  const customUrl = process.env.EXPO_PUBLIC_MS_FORMS_RESPONSE_PAGE_URL;
  if (customUrl) {
    return customUrl;
  }
  // Build URL with form ID - this is the correct format!
  return `https://forms.office.com/pages/responsepage.aspx?id=${MS_FORMS_FORM_ID}&route=shorturl`;
}

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
 * FIXED: Uses correct URL format with form ID
 */
export async function fetchMSTokens(
  responsePageUrl?: string
): Promise<MSTokens> {
  // ⚠️ FIX: Use the correct URL with form ID
  const url = responsePageUrl || getMSFormsResponsePageUrl();
  
  console.log("🔍 Fetching tokens from URL:", url);

  const tokenResponse = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      // ⚠️ IMPORTANT: Don't set Accept-Encoding in React Native
      // React Native fetch automatically handles gzip/deflate decompression
    },
    redirect: "follow", // Follow redirects
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to fetch tokens: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  // ⚠️ FIX: Improved cookie extraction for React Native
  const cookies: string[] = [];
  let formsSessionId = "";
  let requestVerificationTokenFromCookie = "";
  let muid = "";

  // React Native: get all headers
  const allHeaders: Record<string, string> = {};
  const headerKeys: string[] = [];
  tokenResponse.headers.forEach((value, key) => {
    allHeaders[key.toLowerCase()] = value;
    headerKeys.push(key);
  });

  // Log headers for debugging
  console.log("🔍 Response Headers Debug:", {
    headerKeys: headerKeys,
    hasSetCookie: !!allHeaders["set-cookie"],
    setCookieValue: allHeaders["set-cookie"] ? String(allHeaders["set-cookie"]).substring(0, 200) : null,
    setCookieType: typeof allHeaders["set-cookie"],
  });

  // Extract cookies from Set-Cookie header(s)
  const setCookieValue = allHeaders["set-cookie"];
  
  if (setCookieValue) {
    // Handle both string and array cases
    let cookieStrings: string[] = [];
    
    if (Array.isArray(setCookieValue)) {
      cookieStrings = setCookieValue;
    } else if (typeof setCookieValue === "string") {
      // Split cookies - be careful with commas in cookie values
      cookieStrings = setCookieValue.split(/,\s*(?=[\w-]+=)/);
    }

    for (const cookieStr of cookieStrings) {
      const trimmedCookie = cookieStr.trim();
      // Extract cookie name=value (everything before first semicolon)
      const cookiePair = trimmedCookie.split(";")[0].trim();
      
      if (cookiePair) {
        cookies.push(cookiePair);
        
        // Extract specific cookies
        if (cookiePair.startsWith("FormsWebSessionId=")) {
          formsSessionId = cookiePair.split("FormsWebSessionId=")[1] || "";
          console.log("✅ Found FormsWebSessionId cookie");
        }
        if (cookiePair.startsWith("__RequestVerificationToken=")) {
          requestVerificationTokenFromCookie = cookiePair.split("__RequestVerificationToken=")[1] || "";
          console.log("✅ Found __RequestVerificationToken in cookie");
        }
        if (cookiePair.startsWith("MUID=")) {
          muid = cookiePair.split("MUID=")[1] || "";
          console.log("✅ Found MUID cookie");
        }
      }
    }
  } else {
    console.warn("⚠️ No Set-Cookie header found - React Native fetch limitation");
  }

  const contentEncoding = allHeaders["content-encoding"] || "";
  const contentType = allHeaders["content-type"] || "";
  
  console.log("📋 Response Headers:", {
    contentType,
    contentEncoding,
    status: tokenResponse.status,
    cookieCount: cookies.length,
    hasFormsWebSessionId: !!formsSessionId,
    url: url,
  });

  // Get HTML body
  let html = "";
  try {
    html = await tokenResponse.text();
  } catch (error: any) {
    console.error("❌ Failed to read response as text:", error);
    throw new Error(`Failed to read response: ${error.message}`);
  }
  
  console.log("📄 HTML Response Debug:", {
    htmlLength: html.length,
    htmlPreview: html.substring(0, 500),
    isLikelyHTML: html.includes("<html") || html.includes("<!DOCTYPE") || html.includes("<HTML"),
    containsInput: html.includes("<input"),
    containsForm: html.includes("<form"),
    containsScript: html.includes("<script"),
    firstChars: html.substring(0, 50),
  });

  // ⚠️ CRITICAL: Extract token from HTML (try multiple patterns)
  let requestVerificationToken = requestVerificationTokenFromCookie; // Start with cookie value
  let tokenSource = requestVerificationToken ? "Cookie" : "";
  
  // Pattern 1: Standard pattern with double quotes
  let tokenMatch = html.match(
    /name="__RequestVerificationToken"\s+value="([^"]+)"/
  );
  
  // Pattern 2: Pattern with single quotes
  if (!tokenMatch) {
    tokenMatch = html.match(
      /name='__RequestVerificationToken'\s+value='([^']+)'/
    );
  }
  
  // Pattern 3: Pattern without quotes
  if (!tokenMatch) {
    tokenMatch = html.match(
      /name=__RequestVerificationToken\s+value=([^\s>]+)/
    );
  }
  
  // Pattern 4: Pattern in hidden input with different spacing
  if (!tokenMatch) {
    tokenMatch = html.match(
      /<input[^>]*name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']/
    );
  }
  
  // Pattern 5: Pattern in script tag or JSON
  if (!tokenMatch) {
    tokenMatch = html.match(
      /"__RequestVerificationToken"\s*:\s*"([^"]+)"/
    );
  }
  
  // Pattern 6: Look for any input with RequestVerificationToken (case insensitive)
  if (!tokenMatch) {
    tokenMatch = html.match(
      /RequestVerificationToken["']?\s*[=:]\s*["']?([A-Za-z0-9_-]+)/i
    );
  }
  
  // Pattern 7: Extract from JavaScript - antiForgeryToken variable/object
  if (!tokenMatch) {
    tokenMatch = html.match(
      /(?:antiForgeryToken|__RequestVerificationToken)\s*[:=]\s*["']([A-Za-z0-9_\-+/=]+)["']/
    );
  }
  
  // Pattern 8: Extract from JavaScript - look for token in object properties
  if (!tokenMatch) {
    tokenMatch = html.match(
      /["'](?:antiForgeryToken|__RequestVerificationToken)["']\s*:\s*["']([A-Za-z0-9_\-+/=]+)["']/
    );
  }
  
  // Pattern 9: Extract from JavaScript - look for token assignment
  if (!tokenMatch) {
    tokenMatch = html.match(
      /(?:antiForgeryToken|__RequestVerificationToken)\s*=\s*["']([A-Za-z0-9_\-+/=]+)["']/
    );
  }
  
  // Pattern 10: Look for token near antiForgeryToken references
  if (!tokenMatch) {
    tokenMatch = html.match(
      /antiForgeryToken["']?\s*[:=]\s*["']([A-Za-z0-9_\-+/=]{20,})["']/
    );
  }
  
  // Pattern 11: Extract from JavaScript object property - search around token mention
  if (!tokenMatch) {
    const tokenIndex = html.indexOf("RequestVerificationToken");
    if (tokenIndex > -1) {
      const searchWindow = html.substring(
        Math.max(0, tokenIndex - 200),
        Math.min(html.length, tokenIndex + 500)
      );
      
      tokenMatch = searchWindow.match(
        /(?:antiForgeryToken|__RequestVerificationToken)[\s:="']+["']([A-Za-z0-9_\-+/=]{20,})["']/
      );
      
      if (!tokenMatch) {
        tokenMatch = searchWindow.match(
          /(?:antiForgeryToken|__RequestVerificationToken)[\s:=]+([A-Za-z0-9_\-+/=]{20,})/
        );
      }
    }
  }
  
  // Pattern 12: Look for token in JavaScript variable assignment
  if (!tokenMatch) {
    tokenMatch = html.match(
      /(?:var|let|const)\s+(?:antiForgeryToken|__RequestVerificationToken|token)\s*=\s*["']([A-Za-z0-9_\-+/=]{20,})["']/
    );
  }

  if (tokenMatch && tokenMatch[1]) {
    requestVerificationToken = tokenMatch[1];
    tokenSource = "HTML";
    console.log("✅ Token found in HTML");
  } else if (requestVerificationToken) {
    console.log("✅ Using token from cookie");
  } else {
    // Log more details about where RequestVerificationToken appears
    const tokenIndex = html.indexOf("RequestVerificationToken");
    if (tokenIndex > -1) {
      const contextWindow = html.substring(
        Math.max(0, tokenIndex - 300),
        Math.min(html.length, tokenIndex + 500)
      );
      console.log("🔍 Token context (around RequestVerificationToken):", {
        context: contextWindow.substring(0, 400),
        hasAntiForgeryToken: contextWindow.includes("antiForgeryToken"),
        hasQuotes: contextWindow.includes('"') || contextWindow.includes("'"),
        hasColon: contextWindow.includes(":"),
        hasEquals: contextWindow.includes("="),
      });
    }
    
    const snippet = tokenIndex > -1 
      ? html.substring(Math.max(0, tokenIndex - 100), Math.min(html.length, tokenIndex + 200))
      : "Token pattern not found in HTML";
    
    const isReadableHTML = html.includes("<html") || html.includes("<!DOCTYPE") || html.includes("<HTML") || html.includes("<input");
    const isBinary = /[\x00-\x08\x0E-\x1F]/.test(html.substring(0, 100));
    
    console.error("❌ Token extraction failed:", {
      htmlLength: html.length,
      tokenIndex,
      snippet: snippet.substring(0, 300),
      htmlContainsToken: html.includes("RequestVerificationToken"),
      htmlContainsInput: html.includes("<input"),
      isReadableHTML,
      isBinary,
      cookieCount: cookies.length,
      cookies: cookies.map(c => c.substring(0, 50)),
      url: url,
      status: tokenResponse.status,
      contentType: allHeaders["content-type"],
      contentEncoding: allHeaders["content-encoding"],
    });
    
    let errorMsg = `Failed to extract verification token from HTML or cookies. `;
    if (isBinary && !isReadableHTML) {
      errorMsg += `Response appears to be compressed/binary (not readable HTML). `;
      errorMsg += `Content-Encoding: ${allHeaders["content-encoding"] || "none"}. `;
    } else if (!isReadableHTML) {
      errorMsg += `Response doesn't appear to be valid HTML. `;
    }
    errorMsg += `HTML length: ${html.length}, `;
    errorMsg += `Contains 'RequestVerificationToken': ${html.includes("RequestVerificationToken")}, `;
    errorMsg += `Contains '<input': ${html.includes("<input")}, `;
    errorMsg += `Cookies found: ${cookies.length}, `;
    errorMsg += `URL: ${url}, `;
    errorMsg += `Status: ${tokenResponse.status}`;
    
    throw new Error(errorMsg);
  }

  const cookieString = cookies.join("; ");

  // ⚠️ WARNING: If no cookies, log a warning
  if (!cookieString || cookieString.length === 0) {
    console.warn("⚠️ WARNING: No cookies extracted! Submission may fail.");
    console.warn("⚠️ Microsoft Forms typically requires FormsWebSessionId cookie");
    console.warn("⚠️ This might be a React Native fetch limitation with Set-Cookie headers");
  }

  console.log("✅ Token extracted:", {
    hasToken: !!requestVerificationToken,
    tokenLength: requestVerificationToken.length,
    tokenPreview: requestVerificationToken.substring(0, 20) + "...",
    source: tokenSource,
    hasCookies: !!cookieString && cookieString.length > 0,
    cookieCount: cookies.length,
  });

  // Extract x-usersessionid from response headers or generate UUID
  const userSessionId = allHeaders["x-usersessionid"] || generateUUID();

  // Extract IDs from HTML or use defaults
  const userIdMatch = html.match(/"userId":"([^"]+)"/);
  const tenantMatch = html.match(/"tenantId":"([^"]+)"/);
  const userId = userIdMatch?.[1] || MS_FORMS_USER_ID || "";
  const tenantId = tenantMatch?.[1] || MS_FORMS_TENANT_ID || "";

  console.log("✅ Token verification:", {
    hasToken: !!requestVerificationToken,
    tokenLength: requestVerificationToken?.length || 0,
    hasCookies: !!cookieString && cookieString.length > 0,
    cookieCount: cookieString?.split(";").length || 0,
    userId,
    tenantId,
    userSessionId,
    formsSessionId: formsSessionId ? "✓" : "✗",
  });

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

  // ⚠️ CRITICAL: Convert visitDate from M/d/yyyy (React Native format) to YYYY-MM-DD (Microsoft Forms format)
  // React Native sends: "1/13/2026" -> Microsoft Forms expects: "2026-01-13"
  let formattedVisitDate = customerData.visitDate;
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(customerData.visitDate)) {
      formattedVisitDate = customerData.visitDate;
    } else {
      // Convert from M/d/yyyy to YYYY-MM-DD
      const [month, day, year] = customerData.visitDate.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        formattedVisitDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  } catch (e) {
    console.warn("⚠️ Failed to convert date format, using original:", customerData.visitDate);
  }

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
      answer1: formattedVisitDate, // Format: YYYY-MM-DD
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
 * ⚠️ CRITICAL FIX: answers must remain as a STRING, not parsed to array
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
  const msFormsUrl = `https://forms.office.com/formapi/api/${tenantId}/users/${userId}/forms(%27${encodedFormId}%27)/responses`;

  // ⚠️ CRITICAL: payload.answers is already a stringified string from buildMSFormsPayload
  // Next.js working code sends it as a STRING, not an array!
  // Do NOT parse it - Microsoft Forms requires it as a stringified string
  const requestBody = {
    startDate: payload.startDate,
    submitDate: payload.submitDate,
    answers: payload.answers, // Already a string, don't parse it!
  };

  // Verify it's a string before sending
  console.log("Answers type check:", {
    type: typeof requestBody.answers, // Should be "string"
    isString: typeof requestBody.answers === "string",
    preview: requestBody.answers?.substring(0, 100),
  });

  // Parse answers for logging only (don't use this in actual request)
  try {
    const answersArrayForLogging = JSON.parse(requestBody.answers);
    console.log("Request Body (summary):", {
      startDate: requestBody.startDate,
      submitDate: requestBody.submitDate,
      answersCount: answersArrayForLogging.length,
      firstAnswer: answersArrayForLogging[0],
      lastAnswer: answersArrayForLogging[answersArrayForLogging.length - 1],
    });
  } catch (e) {
    console.log("Request Body (summary):", {
      startDate: requestBody.startDate,
      submitDate: requestBody.submitDate,
      answersType: typeof requestBody.answers,
      answersLength: requestBody.answers?.length,
    });
  }

  console.log("=== MS Forms API Request ===");
  console.log("URL:", msFormsUrl);
  console.log("Token Status:", {
    hasToken: !!tokens.requestVerificationToken,
    tokenLength: tokens.requestVerificationToken?.length || 0,
    hasCookies: !!tokens.cookieString,
    cookieLength: tokens.cookieString?.length || 0,
    hasMuid: !!tokens.muid,
    userSessionId: tokens.userSessionId,
  });

  // ⚠️ WARNING: If no cookies, log it
  if (!tokens.cookieString || tokens.cookieString.length === 0) {
    console.warn("⚠️ WARNING: No cookies to send! This may cause submission to fail.");
    console.warn("⚠️ Microsoft Forms typically requires FormsWebSessionId cookie");
  }

  // Log the exact request body that will be sent
  const requestBodyString = JSON.stringify(requestBody);
  console.log("📤 Request Body (exact JSON to send):", {
    fullBody: requestBodyString.substring(0, 500),
    bodyLength: requestBodyString.length,
    answersInBody: requestBodyString.includes('"answers"'),
    answersValueType: typeof requestBody.answers,
    answersIsArray: Array.isArray(requestBody.answers),
    answersCount: Array.isArray(requestBody.answers) ? requestBody.answers.length : 0,
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
      Host: "forms.office.com",
      "odata-maxverion": "4.0",
      "odata-version": "4.0",
      Origin: "https://forms.office.com",
      Referer: `https://forms.office.com/pages/responsepage.aspx?id=${formId}&route=shorturl`,
      "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
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

    // Check for validation errors
    if (response.status === 400 && responseData?.errors) {
      const errorMessage = responseData.errors[""]?.[0] || "The input was not valid.";
      console.error("❌ Validation Error:", errorMessage);
      
      // If no cookies were sent, this is likely the cause
      if (!tokens.cookieString || tokens.cookieString.length === 0) {
        throw new Error(
          `Microsoft Forms submission failed: ${errorMessage}. ` +
          `This is likely because cookies (FormsWebSessionId) were not extracted due to React Native fetch limitations. ` +
          `SOLUTION: Move token fetching and submission to a Supabase Edge Function or backend service where cookies can be properly handled.`
        );
      }
      
      throw new Error(
        `Microsoft Forms submission failed: ${errorMessage}. ` +
        `Check that all field values are correct and match the form's expected format.`
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
 * 
 * ⚠️ UPDATED: Now uses Supabase Edge Function to handle cookies properly
 * React Native cannot extract Set-Cookie headers, so we delegate to Edge Function
 */
export async function registerCustomerToMSForms(
  customerData: CustomerRegistrationData,
  agentData: AgentData
): Promise<MSFormsSubmissionResult> {
  try {
    console.log("=== MS Forms Service: Starting Registration ===");
    console.log("Using Supabase Edge Function for cookie handling...");
    
    // Import Supabase client
    const { supabase } = await import("../supabase");

    // Call Supabase Edge Function
    console.log("Calling Supabase Edge Function: submit-ms-forms");
    
    // Get the current session to ensure auth token is sent
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Session status:", session ? "Authenticated" : "Not authenticated");
    
    const { data, error } = await supabase.functions.invoke("submit-ms-forms", {
      body: {
        customerData,
        agentData,
      },
      // Headers are automatically added by Supabase client if session exists
    });

    // Log full response for debugging
    console.log("Edge Function response:", { data, error });

    if (error) {
      console.error("Edge Function error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check for 401 Unauthorized - means function requires authentication
      if (error.context?.status === 401) {
        throw new Error(
          "Edge Function requires authentication. " +
          "Either: 1) Redeploy with --no-verify-jwt flag, or 2) Ensure user is logged in. " +
          "Error: " + (error.message || "Unauthorized")
        );
      }
      
      // Try to extract error message from error object
      const errorMessage = error.message || error.error?.message || "Edge Function call failed";
      
      // If data exists but has an error, use that
      if (data && data.error) {
        throw new Error(data.error);
      }
      
      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error("No data returned from Edge Function. Make sure the function is deployed.");
    }

    // Check if Edge Function returned an error in the data
    if (data.error) {
      console.error("Edge Function returned error in data:", data.error);
      throw new Error(data.error);
    }

    console.log("✅ MS Forms submission completed via Edge Function:", {
      success: data.success,
      responseId: data.responseId,
      submitDate: data.submitDate,
    });

    return {
      success: data.success ?? false,
      responseId: data.responseId,
      submitDate: data.submitDate,
      responder: data.responder,
      error: data.error,
    };
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

