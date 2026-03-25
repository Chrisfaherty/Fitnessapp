package com.fitcoach.app.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.EntryPointAccessors
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class FitCoachMessagingService : FirebaseMessagingService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO)
    private val channelId = "fitcoach_general"

    private val supabase: SupabaseClient by lazy {
        EntryPointAccessors.fromApplication(
            applicationContext,
            SupabaseEntryPoint::class.java
        ).supabaseClient()
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: return
        val body = message.notification?.body ?: return
        val deepLink = message.data["deepLink"]

        val intent = Intent(Intent.ACTION_VIEW).apply {
            if (deepLink != null) {
                data = android.net.Uri.parse(deepLink)
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Re-upsert token to Supabase when FCM issues a new one
        val prefs = getSharedPreferences("fitcoach_prefs", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null) ?: return

        serviceScope.launch {
            try {
                supabase
                    .from("push_tokens")
                    .upsert(
                        buildJsonObject {
                            put("user_id", userId)
                            put("token", token)
                            put("platform", "android")
                        }
                    ) {
                        onConflict = "user_id,platform"
                    }
            } catch (e: Exception) {
                // Token will be saved next time the user opens the app
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "FitCoach Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Workout assignments, messages, and check-in updates"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
