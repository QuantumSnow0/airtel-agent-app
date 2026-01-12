Two issues are causing the failure:
Problem 1: Answers format — still wrong
Your log shows:
"answers": [ // ❌ This is an ARRAY, not a STRING! { "questionId": "r0feee2e2bc7c44fb9af400709e7e6276", "answer1": "Enterprise" }, ...]
Microsoft Forms requires answers to be a JSON stringified string, not an array. It should look like:
"answers": "[{\"questionId\":\"r0feee2e2bc7c44fb9af400709e7e6276\",\"answer1\":\"Enterprise\"},...]"
Problem 2: Missing token and cookies
Your log shows:
Token Status: {"hasToken": false, "hasCookies": false}
Without the verification token and cookies, the request will be rejected.
Solution
Fix 1: Ensure answers is a stringified string
In your buildMSFormsPayload function, make sure you stringify answers:
function buildMSFormsPayload(customerData, internalDefaults, questionIds) { // ... build answers array ... const answers = [ { questionId: questionIds.agentType, answer1: internalDefaults.agentType }, // ... all other answers ... ]; // ⚠️ CRITICAL: answers MUST be JSON.stringify() - a STRING! return { startDate: new Date().toISOString(), submitDate: new Date().toISOString(), answers: JSON.stringify(answers), // ← Must be stringified! correlationId: generateUUID(), };}
Then, when building the request body, do not stringify it again:
async function submitToMSForms(formId, tenantId, userId, payload, tokens) { // payload.answers is already a string from buildMSFormsPayload const requestBody = { startDate: payload.startDate, submitDate: payload.submitDate, answers: payload.answers, // Already a string, don't stringify again! }; // Verify it's a string before sending console.log("Answers type check:", { type: typeof requestBody.answers, // Should be "string" isString: typeof requestBody.answers === "string", preview: requestBody.answers.substring(0, 100), }); const response = await fetch(url, { method: "POST", headers: { **requestverificationtoken: tokens.requestVerificationToken, // ... other headers ... }, body: JSON.stringify(requestBody), // Stringify the entire body object });}
Fix 2: Extract token from HTML body
Your token extraction is failing. Fix it like this:
async function fetchMSTokens(responsePageUrl) { const tokenResponse = await fetch(responsePageUrl, { method: "GET", headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,_/_;q=0.8", "Accept-Language": "en-US,en;q=0.9", }, }); if (!tokenResponse.ok) { throw new Error(`Failed to fetch tokens: ${tokenResponse.status}`); } // Get HTML body FIRST (this is where the token is!) const html = await tokenResponse.text(); // ⚠️ CRITICAL: Extract token from HTML (this is the main token!) const tokenMatch = html.match( /name="**RequestVerificationToken"\s+value="([^"]+)"/ ); if (!tokenMatch || !tokenMatch[1]) { throw new Error("Failed to extract verification token from HTML"); } const requestVerificationToken = tokenMatch[1]; console.log("✅ Token extracted:", { hasToken: !!requestVerificationToken, tokenLength: requestVerificationToken.length, tokenPreview: requestVerificationToken.substring(0, 20) + "...", }); // Extract cookies (React Native compatible) const allHeaders = {}; tokenResponse.headers.forEach((value, key) => { allHeaders[key.toLowerCase()] = value; }); const cookies = []; const setCookieHeader = allHeaders["set-cookie"]; if (setCookieHeader) { const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]; for (const cookie of cookieArray) { const cookiePair = cookie.split(";")[0].trim(); cookies.push(cookiePair); } } const cookieString = cookies.join("; "); const userSessionId = allHeaders["x-usersessionid"] || generateUUID(); // Extract IDs from HTML or use defaults const userIdMatch = html.match(/"userId":"([^"]+)"/); const tenantMatch = html.match(/"tenantId":"([^"]+)"/); const userId = userIdMatch?.[1] || process.env.EXPO_PUBLIC_MS_FORMS_USER_ID || ""; const tenantId = tenantMatch?.[1] || process.env.EXPO_PUBLIC_MS_FORMS_TENANT_ID || ""; return { requestVerificationToken, // From HTML body cookieString, // From headers muid: cookies.find(c => c.startsWith("MUID="))?.split("MUID=")[1] || "", userSessionId, userId, tenantId, };}
Verification checklist
Add these logs to verify:
// After building payloadconsole.log("Payload verification:", { answersType: typeof payload.answers, // Must be "string" answersIsString: typeof payload.answers === "string", answersStartsWith: payload.answers?.startsWith("["), // Should start with "[" answersLength: payload.answers?.length,});// After token fetchconsole.log("Token verification:", { hasToken: !!tokens.requestVerificationToken, tokenLength: tokens.requestVerificationToken?.length, hasCookies: !!tokens.cookieString && tokens.cookieString.length > 0, cookieCount: tokens.cookieString?.split(";").length || 0,});// Before sending requestconsole.log("Request body check:", { answersType: typeof requestBody.answers, // Must be "string" answersPreview: requestBody.answers?.substring(0, 150),});
Summary
answers must be a JSON stringified string: JSON.stringify(answers) in buildMSFormsPayload.
Extract the verification token from the HTML body, not just cookies.
Do not stringify answers again when building the request body; it should already be a string.
Verify typeof payload.answers === "string" before sending.
The main issue is that answers is being sent as an array [...] instead of a stringified string "[...]". Fix the stringification in buildMSFormsPayload and ensure the token is extracted from the HTML body.
