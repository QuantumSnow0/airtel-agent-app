const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const CHANNEL_ID = "wam_lead_offers_v9";

/** Delegates to scripts/patch-lead-notifications-native.js (single source of truth). */
function withLeadOfferNotificationIcons(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      require(path.join(cfg.modRequest.projectRoot, "scripts/patch-lead-notifications-native.js")).main();
      return cfg;
    },
  ]);
}

module.exports = withLeadOfferNotificationIcons;
module.exports.CHANNEL_ID = CHANNEL_ID;
