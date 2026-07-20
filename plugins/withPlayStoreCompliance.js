const { withAndroidManifest } = require("@expo/config-plugins");

const REMOVE_PERMISSIONS = [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

/** Strip risky permissions and disable backup for customer PII (Play Store). */
function withPlayStoreCompliance(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (manifest.application?.[0]?.$) {
      manifest.application[0].$["android:allowBackup"] = "false";
      manifest.application[0].$["android:fullBackupContent"] = "@xml/backup_rules";
    }

    if (Array.isArray(manifest["uses-permission"])) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (entry) => !REMOVE_PERMISSIONS.includes(entry.$["android:name"]),
      );
    }

    return cfg;
  });
}

module.exports = withPlayStoreCompliance;
