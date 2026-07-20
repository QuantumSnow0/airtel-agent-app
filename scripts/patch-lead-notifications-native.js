#!/usr/bin/env node
/**
 * Idempotent native patches for lead-offer push notifications (actions + channel + sound).
 * Runs on postinstall and EAS prebuildCommand so cloud builds always get fresh patches.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHANNEL_ID = "wam_lead_offers_v9";

const NOTIFICATION_SOUNDS = [
  { src: "assets/sounds/lead_push_alert.wav", dest: "lead_push_alert.wav" },
  { src: "assets/sounds/lead_offer.wav", dest: "lead_offer.wav" },
];

const PATHS = {
  builder: path.join(
    ROOT,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/presentation/builders/ExpoNotificationBuilder.kt",
  ),
  data: path.join(
    ROOT,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/model/NotificationData.kt",
  ),
  remote: path.join(
    ROOT,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/model/RemoteNotificationContent.kt",
  ),
  fcm: path.join(
    ROOT,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/FirebaseMessagingDelegate.kt",
  ),
  handling: path.join(
    ROOT,
    "node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoHandlingDelegate.kt",
  ),
  setupKt: path.join(
    ROOT,
    "android/app/src/main/java/com/wam/apps/WamLeadOfferNotificationSetup.kt",
  ),
  mainApp: path.join(
    ROOT,
    "android/app/src/main/java/com/wam/apps/MainApplication.kt",
  ),
};

const WAM_KOTLIN_HELPERS = `
  // --- WAM lead-offer notification patch (patch-lead-notifications-native.js) ---
  private fun wamRemoteData(): Map<String, String> {
    val trigger = notification.notificationRequest.trigger
    if (trigger is expo.modules.notifications.notifications.model.triggers.FirebaseNotificationTrigger) {
      return trigger.remoteMessage.data
    }
    return emptyMap()
  }

  private fun isWamLeadOffer(): Boolean {
    val content = notificationContent
    if (content.categoryId == "LEAD_OFFER") return true
    val data = wamRemoteData()
    if (data["categoryId"] == "LEAD_OFFER" || data["type"] == "LEAD_OFFER") return true
    val leadType = when (content) {
      is expo.modules.notifications.notifications.model.RemoteNotificationContent ->
        content.notificationType
      else -> content.body?.optString("type")
    }
    return leadType == "LEAD_OFFER"
  }

  private fun wamProductFromSubtitle(): String? {
    val sub = notificationContent.subText ?: return null
    return when {
      sub.contains("airtel", ignoreCase = true) -> "airtel"
      sub.contains("safaricom", ignoreCase = true) -> "safaricom"
      else -> null
    }
  }

  private fun wamProductFromBodyMetadata(): String? {
    return try {
      val body = notificationContent.body ?: return null
      val meta = body.opt("metadata") ?: return null
      when (meta) {
        is org.json.JSONObject ->
          meta.optJSONObject("preview")?.optString("product")
        is String ->
          org.json.JSONObject(meta).optJSONObject("preview")?.optString("product")
        else -> null
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun normalizeWamProduct(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    val p = raw.trim().lowercase()
    return when {
      p.contains("airtel") -> "airtel"
      p.contains("safaricom") -> "safaricom"
      else -> null
    }
  }

  private fun wamProduct(): String? {
    val data = wamRemoteData()
    normalizeWamProduct(data["product"])?.let { return it }
    val content = notificationContent
    val direct = when (content) {
      is expo.modules.notifications.notifications.model.RemoteNotificationContent ->
        content.providerProduct
      else -> content.body?.optString("product")
    }
    normalizeWamProduct(direct)?.let { return it }
    normalizeWamProduct(wamProductFromBodyMetadata())?.let { return it }
    return try {
      val meta = data["metadata"] ?: return wamProductFromSubtitle()
      normalizeWamProduct(
        org.json.JSONObject(meta).optJSONObject("preview")?.optString("product"),
      ) ?: wamProductFromSubtitle()
    } catch (_: Exception) {
      wamProductFromSubtitle()
    }
  }

  private fun ensureWamLeadOfferChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channelId = "${CHANNEL_ID}"
    val manager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val soundUri =
      android.net.Uri.parse("android.resource://\${context.packageName}/raw/lead_push_alert")
    val existing = manager.getNotificationChannel(channelId)
    if (existing != null) {
      val soundWrong =
        existing.sound?.toString()?.contains("lead_push_alert") != true
      val importanceLow = existing.importance < NotificationManager.IMPORTANCE_MAX
      if (!soundWrong && !importanceLow) {
        return
      }
      manager.deleteNotificationChannel(channelId)
    }
    val channel = NotificationChannel(
      channelId,
      "Lead offers",
      NotificationManager.IMPORTANCE_MAX,
    ).apply {
      description = "Urgent new customer lead alerts"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 600)
      enableLights(true)
      lightColor = android.graphics.Color.RED
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setShowBadge(true)
      setSound(
        soundUri,
        android.media.AudioAttributes.Builder()
          .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
    }
    manager.createNotificationChannel(channel)
  }

  private fun squareCropNotificationIcon(source: Bitmap): Bitmap {
    val cropSize = minOf(source.width, source.height)
    val x = 0
    val y = maxOf(0, (source.height - cropSize) / 2)
    val cropped = Bitmap.createBitmap(source, x, y, cropSize, cropSize)
    return Bitmap.createScaledBitmap(cropped, 128, 128, true)
  }

  private fun loadWamProviderLargeIcon(): Bitmap? {
    // Play Store: text/colour branding only — no third-party logos in notifications.
    return null
  }

  private fun addWamLeadOfferActions(builder: NotificationCompat.Builder) {
    if (!isWamLeadOffer()) return
    val accept = NotificationAction("LEAD_OFFER_ACCEPT", "Accept", true)
    val decline = NotificationAction("LEAD_OFFER_DECLINE", "Decline", false)
    builder.addAction(buildButtonAction(accept))
    builder.addAction(buildButtonAction(decline))
  }

  private fun applyWamLeadOfferPresentation(builder: NotificationCompat.Builder) {
    if (!isWamLeadOffer()) return
    ensureWamLeadOfferChannel()
    builder.setChannelId("${CHANNEL_ID}")
    builder.setPriority(NotificationCompat.PRIORITY_MAX)
    builder.setSilent(false)
    builder.setColorized(true)
    val content = notificationContent
    val accent = content.color?.toInt()
    if (accent != null) {
      builder.color = accent
    }
    val bigText = listOfNotNull(content.subText, content.text).joinToString("\\n")
    builder.setStyle(
      NotificationCompat.BigTextStyle()
        .bigText(bigText)
        .setBigContentTitle(content.title),
    )
  }
  // --- end WAM patch ---
`;

const SETUP_KT = `package com.wam.apps

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build

object WamLeadOfferNotificationSetup {
  const val CHANNEL_ID = "${CHANNEL_ID}"

  private fun expectedSoundUri(context: Context): Uri =
    Uri.parse("android.resource://\${context.packageName}/raw/lead_push_alert")

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val expectedSound = expectedSoundUri(context)
    val existing = manager.getNotificationChannel(CHANNEL_ID)
    if (existing != null) {
      val soundWrong =
        existing.sound?.toString()?.contains("lead_push_alert") != true
      val importanceLow = existing.importance < NotificationManager.IMPORTANCE_MAX
      if (!soundWrong && !importanceLow) {
        return
      }
      manager.deleteNotificationChannel(CHANNEL_ID)
    }

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "Lead offers",
        NotificationManager.IMPORTANCE_MAX,
      ).apply {
        description = "Urgent new customer lead alerts"
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 600)
        enableLights(true)
        lightColor = Color.RED
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        setShowBadge(true)
        setSound(
          expectedSound,
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
      }

    manager.createNotificationChannel(channel)
  }
}
`;

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function fixInvertedWamBuildBlock(src) {
  const bad = `    if (!isWamLeadOffer()) {
      addWamLeadOfferActions(builder)
    applyWamLeadOfferPresentation(builder)
    if (!isWamLeadOffer()) {
      notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }
    }
    }`;
  const good = `    addWamLeadOfferActions(builder)
    applyWamLeadOfferPresentation(builder)
    if (!isWamLeadOffer()) {
      notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }
    }`;
  return src.includes(bad) ? src.replace(bad, good) : src;
}

function stripWamBlock(src) {
  let next = src;
  next = next.replace(
    /\n  \/\/ --- WAM lead-offer notification patch[\s\S]*?\/\/ --- end WAM patch ---\n/g,
    "\n",
  );
  const fnNames = [
    "ensureWamLeadOfferChannel",
    "isWamLeadOffer",
    "wamLeadOfferId",
    "wamProduct",
    "loadWamProviderLargeIcon",
    "addWamLeadOfferActions",
    "applyWamLeadOfferPresentation",
  ];
  for (const name of fnNames) {
    const fnRe = new RegExp(`\\n  private fun ${name}\\([\\s\\S]*?\\n  \\}\\n`, "g");
    next = next.replace(fnRe, "\n");
  }
  next = next.replace(/\n  ensureWamLeadOfferChannel\(\)\n/g, "\n");
  next = next.replace(
    /if \(!isWamLeadOffer\(\)\) \{\s*addWamLeadOfferActions\(builder\)\s*applyWamLeadOfferPresentation\(builder\)\s*if \(!isWamLeadOffer\(\)\) \{\s*notificationContent\.categoryId\?\.let \{ addActionsToBuilder\(builder, it\) \}\s*\}\s*\}/g,
    `addWamLeadOfferActions(builder)
    applyWamLeadOfferPresentation(builder)
    if (!isWamLeadOffer()) {
      notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }
    }`,
  );
  return next;
}

function patchBuilder(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn("[patch] missing ExpoNotificationBuilder.kt — run npm install");
    return false;
  }

  let src = fixInvertedWamBuildBlock(stripWamBlock(read(filePath)));

  if (!src.includes("import android.app.NotificationChannel")) {
    src = src.replace(
      "import android.app.Notification",
      "import android.app.Notification\nimport android.app.NotificationChannel\nimport android.app.NotificationManager",
    );
  }

  src = src.replace(
    /open class ExpoNotificationBuilder\([\s\S]*?\) : BaseNotificationBuilder\(context, notification\) \{\n/,
    (match) => `${match}${WAM_KOTLIN_HELPERS}\n`,
  );

  const wamBuildBlock = `addWamLeadOfferActions(builder)
    applyWamLeadOfferPresentation(builder)
    if (!isWamLeadOffer()) {
      notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }
    }`;

  src = fixInvertedWamBuildBlock(src);

  if (!src.includes("addWamLeadOfferActions(builder)")) {
    src = src.replace(
      "notificationContent.categoryId?.let { addActionsToBuilder(builder, it) }",
      wamBuildBlock,
    );
  }

  if (!src.includes("NotificationCompat.Builder(context, \"${CHANNEL_ID}\")")) {
    src = src.replace(
      `    val builder = createBuilder()`,
      `    val builder = if (isWamLeadOffer() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ensureWamLeadOfferChannel()
      NotificationCompat.Builder(context, "${CHANNEL_ID}")
    } else {
      createBuilder()
    }`,
    );
  }

  if (!src.includes("val wamProviderIcon = loadWamProviderLargeIcon()")) {
    src = src.replace(
      `    if (notificationContent.containsImage()) {
      val bitmap = notificationContent.getImage(context)
      bitmap?.let { builder.setLargeIcon(it) }
    } else {
      builder.setLargeIcon(largeIcon)
    }`,
      `    val wamProviderIcon = loadWamProviderLargeIcon()
    if (wamProviderIcon != null) {
      builder.setLargeIcon(wamProviderIcon)
    } else if (notificationContent.containsImage()) {
      val bitmap = notificationContent.getImage(context)
      bitmap?.let { builder.setLargeIcon(it) }
    } else {
      builder.setLargeIcon(largeIcon)
    }`,
    );
  }

  if (!src.includes("!isWamLeadOffer()) {\n      // Notification will not vibrate")) {
    src = src.replace(
      `    if (!shouldPlaySound && !shouldVibrate) {
      // Notification will not vibrate or play sound, regardless of channel
      builder.setSilent(true)
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {`,
      `    if (!shouldPlaySound && !shouldVibrate && !isWamLeadOffer()) {
      // Notification will not vibrate or play sound, regardless of channel
      builder.setSilent(true)
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {`,
    );
  }

  write(filePath, src);
  return true;
}

function patchNotificationData(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = read(filePath);
  if (!src.includes('data["product"]')) {
    src = src.replace(
      "  val categoryId: String?\n    get() = data[\"categoryId\"]",
      "  val product: String?\n    get() = data[\"product\"]\n\n  val notificationType: String?\n    get() = data[\"type\"]\n\n  val offerId: String?\n    get() = data[\"offerId\"]\n\n  val categoryId: String?\n    get() = data[\"categoryId\"]",
    );
  }
  write(filePath, src);
  return true;
}

function patchRemoteContent(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = read(filePath);

  if (!src.includes("val remoteMessage: RemoteMessage")) {
    src = src.replace(
      "class RemoteNotificationContent(private val remoteMessage: RemoteMessage)",
      "class RemoteNotificationContent(val remoteMessage: RemoteMessage)",
    );
  }

  if (!src.includes("val providerProduct")) {
    src = src.replace(
      "  override val categoryId = notificationData.categoryId",
      "  val providerProduct: String?\n    get() = notificationData.product\n\n  val notificationType: String?\n    get() = notificationData.notificationType\n\n  val offerId: String?\n    get() = notificationData.offerId\n\n  override val categoryId = notificationData.categoryId",
    );
  }

  if (!src.includes("takeIf { it.isNotBlank() }")) {
    src = src.replace(
      "  override val title = remoteMessage.notification?.title ?: notificationData.title\n\n  override val text = remoteMessage.notification?.body ?: notificationData.message",
      `  override val title: String?
    get() = remoteMessage.notification?.title?.takeIf { it.isNotBlank() }
      ?: notificationData.title

  override val text: String?
    get() = remoteMessage.notification?.body?.takeIf { it.isNotBlank() }
      ?: notificationData.message`,
    );
  }

  write(filePath, src);
  return true;
}

function patchHandlingDelegateDeclineDismiss(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = read(filePath);
  if (src.includes("WAM decline: dismiss notification from shade")) return true;

  const needle = `  override fun handleNotificationResponse(notificationResponse: NotificationResponse) {
    if (!isAppInForeground()) {`;
  if (!src.includes(needle)) return false;

  src = src.replace(
    needle,
    `  override fun handleNotificationResponse(notificationResponse: NotificationResponse) {
    // WAM decline: dismiss notification from shade without opening app
    if (notificationResponse.actionIdentifier == "LEAD_OFFER_DECLINE") {
      NotificationsService.dismiss(
        context,
        arrayOf(notificationResponse.notification.notificationRequest.identifier),
      )
    }
    if (!isAppInForeground()) {`,
  );
  write(filePath, src);
  return true;
}

function patchHandlingDelegate(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = read(filePath);
  const defaultBlock = `  private fun Notification.shouldPresent(): Boolean {
    return !(notificationRequest.content.title.isNullOrEmpty() && notificationRequest.content.text.isNullOrEmpty())
  }`;

  if (
    src.includes(defaultBlock) &&
    !src.includes("WAM lead-offer: background task presents")
  ) {
    return true;
  }

  src = src.replace(
    /private fun Notification\.shouldPresent\(\): Boolean \{[\s\S]*?^  \}/m,
    defaultBlock,
  );
  write(filePath, src);
  return true;
}

function patchFcmDelegate(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = read(filePath);

  if (!src.includes("WamLeadOfferNotificationSetup.ensureChannel")) {
    src = src.replace(
      "DebugLogging.logRemoteMessage(\"FirebaseMessagingDelegate.onMessageReceived: message\", remoteMessage)",
      "com.wam.apps.WamLeadOfferNotificationSetup.ensureChannel(context)\n    DebugLogging.logRemoteMessage(\"FirebaseMessagingDelegate.onMessageReceived: message\", remoteMessage)",
    );
  }

  if (!src.includes("WAM lead-offer: force rich present in background")) {
    src = src.replace(
      `    NotificationsService.receive(context, notification)
    runTaskManagerTasks(context.applicationContext, RemoteMessageSerializer.toBundle(remoteMessage))`,
      `    NotificationsService.receive(context, notification)
    // WAM lead-offer: force rich present in background (patched ExpoNotificationBuilder).
    val wamLeadType = remoteMessage.data["type"]
    val wamLeadCategory = remoteMessage.data["categoryId"]
    if (wamLeadType == "LEAD_OFFER" || wamLeadCategory == "LEAD_OFFER") {
      val lifecycle =
        androidx.lifecycle.ProcessLifecycleOwner.get().lifecycle.currentState
      if (!lifecycle.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)) {
        NotificationsService.present(context, notification)
      }
    }
    runTaskManagerTasks(context.applicationContext, RemoteMessageSerializer.toBundle(remoteMessage))`,
    );
  }

  write(filePath, src);
  return true;
}

function patchMainApplication(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let src = read(filePath);
  if (!src.includes("WamLeadOfferNotificationSetup.ensureChannel")) {
    src = src.replace(
      "import expo.modules.ApplicationLifecycleDispatcher",
      "import com.wam.apps.WamLeadOfferNotificationSetup\nimport expo.modules.ApplicationLifecycleDispatcher",
    );
    src = src.replace(
      "ApplicationLifecycleDispatcher.onApplicationCreate(this)",
      "WamLeadOfferNotificationSetup.ensureChannel(this)\n    ApplicationLifecycleDispatcher.onApplicationCreate(this)",
    );
  }
  write(filePath, src);
  return true;
}

function copyNotificationSounds() {
  const rawDir = path.join(ROOT, "android/app/src/main/res/raw");
  for (const { src, dest } of NOTIFICATION_SOUNDS) {
    const source = path.join(ROOT, src);
    if (!fs.existsSync(source)) {
      console.warn(`[patch] missing sound source ${src}`);
      continue;
    }
    fs.mkdirSync(rawDir, { recursive: true });
    fs.copyFileSync(source, path.join(rawDir, dest));
  }
}

function main() {
  console.log(`[patch] Lead offer notifications → channel ${CHANNEL_ID}`);
  copyNotificationSounds();
  write(PATHS.setupKt, SETUP_KT);
  patchMainApplication(PATHS.mainApp);
  patchNotificationData(PATHS.data);
  patchRemoteContent(PATHS.remote);
  patchFcmDelegate(PATHS.fcm);
  patchHandlingDelegateDeclineDismiss(PATHS.handling);
  patchHandlingDelegate(PATHS.handling);
  const ok = patchBuilder(PATHS.builder);
  if (!ok) {
    throw new Error("ExpoNotificationBuilder.kt not found — run npm install");
  }
  console.log("[patch] Done.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = { main, CHANNEL_ID };
