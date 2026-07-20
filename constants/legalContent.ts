import { COMPANY_NAME, SUPPORT_PHONE } from "./legal";

export type LegalSection = { title: string; paragraphs: string[] };

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
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
