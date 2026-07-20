import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const COMPANY_NAME = "WAM Apps";
const SUPPORT_PHONE = "0700776994";

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "Introduction",
    paragraphs: [
      `${COMPANY_NAME} ("we", "our", or "us") provides a mobile application for approved field agents who register customers and receive lead offers for internet installation services.`,
      "This Privacy Policy explains what we collect, how we use it, who we share it with, and your choices. By using the app you agree to this policy.",
      "We are an independent agent operations platform. We are not Airtel Kenya or Safaricom PLC. Those companies have their own privacy practices for services they provide.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "Agent account data: name, email, phone numbers, profile details, device push tokens, and app activity (registrations, commissions, lead responses).",
      "Customer data entered by agents: customer name, phone numbers, email, installation town, landmark/address text, preferred package, visit date and time, and related registration notes.",
      "Technical data: app version, connectivity/sync status, and diagnostic logs needed to operate notifications and offline sync.",
      "We do not collect precise GPS location from your device. Town and area fields are text entered by the agent or customer.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "To register customers and submit orders to authorized carrier workflows (including Microsoft Forms where configured).",
      "To dispatch installation leads to agents, send push notifications, and record accept/decline responses.",
      "To calculate commissions, show earnings, and communicate account or payout updates.",
      "To keep the app secure, prevent abuse, and comply with law.",
    ],
  },
  {
    title: "How we share information",
    paragraphs: [
      "With telecommunications partners and their authorized processes (for example Airtel or Safaricom registration pipelines) solely to fulfil customer orders.",
      "With service providers that help us run the app (cloud hosting, authentication, push delivery).",
      "We do not sell personal information.",
      "We may disclose information if required by law or to protect rights, safety, and fraud prevention.",
    ],
  },
  {
    title: "Data retention & security",
    paragraphs: [
      "We retain data while your agent account is active and as needed for commissions, disputes, and legal obligations.",
      "Customer registration data may be stored on your device offline until synced. Device backups for this app are disabled on Android release builds.",
      "We use industry-standard security measures, but no system is 100% secure.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "Agents can update profile details in the app, disable notifications in system settings, and delete their account from Profile (requires internet).",
      "Customers should be informed by the registering agent that their details will be submitted for service processing.",
      "For privacy questions contact us using the support phone below.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `${COMPANY_NAME} support: ${SUPPORT_PHONE}`,
      "Package: com.wam.apps",
    ],
  },
];

function renderHtml(): string {
  const body = SECTIONS.map(
    (section) => `
      <section>
        <h2>${section.title}</h2>
        ${section.paragraphs.map((p) => `<p>${p}</p>`).join("")}
      </section>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${COMPANY_NAME} Privacy Policy</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #222; max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { color: #0066CC; font-size: 1.75rem; margin-bottom: 0.25rem; }
    .updated { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    h2 { font-size: 1.15rem; margin-top: 1.75rem; color: #333; }
    p { margin: 0.6rem 0; }
  </style>
</head>
<body>
  <h1>${COMPANY_NAME} Privacy Policy</h1>
  <p class="updated">Last updated: May 2026</p>
  ${body}
</body>
</html>`;
}

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  return new Response(renderHtml(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
