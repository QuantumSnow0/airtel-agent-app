#!/usr/bin/env node
/**
 * Verify lead-offer native patches before EAS build.
 * Usage: node scripts/verify-lead-notifications-native.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHANNEL_ID = "wam_lead_offers_v9";
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

const builderPath = path.join(
  ROOT,
  "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt",
);

if (fs.existsSync(builderPath)) {
  const builder = fs.readFileSync(builderPath, "utf8");
  check(builder.includes("addWamLeadOfferActions"), "Missing addWamLeadOfferActions");
  check(builder.includes("loadWamProviderLargeIcon"), "Missing loadWamProviderLargeIcon");
  check(builder.includes(`setChannelId("${CHANNEL_ID}")`), `Missing setChannelId("${CHANNEL_ID}")`);
  check(builder.includes('content.categoryId == "LEAD_OFFER"'), "Missing categoryId LEAD_OFFER detection");
  check(
    !builder.includes("if (!isWamLeadOffer()) {\n      addWamLeadOfferActions"),
    "Inverted WAM patch — rich UI runs only when NOT a lead offer (re-run patch script)",
  );
  check(
    builder.includes("addWamLeadOfferActions(builder)\n    applyWamLeadOfferPresentation"),
    "WAM rich presentation block missing or corrupted",
  );
} else {
  errors.push("expo-notifications not installed");
}

const setupKt = path.join(
  ROOT,
  "android/app/src/main/java/com/wam/apps/WamLeadOfferNotificationSetup.kt",
);
if (fs.existsSync(setupKt)) {
  check(
    fs.readFileSync(setupKt, "utf8").includes(CHANNEL_ID),
    `WamLeadOfferNotificationSetup.kt must use ${CHANNEL_ID}`,
  );
}

check(
  fs.existsSync(path.join(ROOT, "android/app/src/main/res/raw/lead_push_alert.wav")),
  "Missing android raw sound lead_push_alert.wav — run patch script before EAS build",
);

const fcmPath = path.join(
  ROOT,
  "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/FirebaseMessagingDelegate.kt",
);
if (fs.existsSync(fcmPath)) {
  check(
    fs.readFileSync(fcmPath, "utf8").includes("WamLeadOfferNotificationSetup.ensureChannel"),
    "FCM delegate must call WamLeadOfferNotificationSetup.ensureChannel",
  );
}

console.log("Lead notification native verification\n");
if (errors.length === 0) {
  console.log(`OK — patches ready for channel ${CHANNEL_ID}.`);
} else {
  console.log("FAILED:");
  for (const e of errors) console.log(`  - ${e}`);
}

console.log(
  "\nRebuild with: npm run build:android (EAS preview APK). After install, open app once before testing push.",
);

process.exit(errors.length ? 1 : 0);
