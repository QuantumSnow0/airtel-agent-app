package com.wam.apps

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build

object WamLeadOfferNotificationSetup {
  const val CHANNEL_ID = "wam_lead_offers_v9"

  private fun expectedSoundUri(context: Context): Uri =
    Uri.parse("android.resource://${context.packageName}/raw/lead_push_alert")

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
