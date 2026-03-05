package com.fitnessapp.data.health

import com.fitnessapp.data.model.DailyMetrics
import com.fitnessapp.data.model.WorkoutEntry
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Upsert
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.todayIn
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncRepository @Inject constructor(
    private val healthClient: HealthDataClient,
    private val supabase: SupabaseClient
) {
    /**
     * Syncs the last [days] days of health data to Supabase.
     * Safe to call repeatedly — uses upsert with conflict on (user_id, date).
     */
    suspend fun syncHealthData(days: Int = 7) {
        val userId = supabase.gotrue.currentUserOrNull()?.id ?: return
        val today = Clock.System.todayIn(TimeZone.currentSystemDefault())
        val from = today.minus(days - 1, DateTimeUnit.DAY)

        val metrics = healthClient.fetchDailyMetrics(from, today)
        if (metrics.isEmpty()) return

        val rows = metrics.map { m ->
            mapOf(
                "user_id"        to userId,
                "date"           to m.date.toString(),
                "steps"          to m.steps,
                "calories_out"   to m.activeCaloriesBurned,
                "weight_kg"      to m.weightKg,
                "protein_g"      to m.proteinG,
                "carbs_g"        to m.carbsG,
                "fat_g"          to m.fatG,
                "water_ml"       to m.waterMl,
                "sleep_seconds"  to m.sleepSeconds
            ).filterValues { it != null }
        }

        supabase.postgrest["health_daily"].upsert(rows, upsert = Upsert(onConflict = "user_id,date"))

        // Sync workout sessions from Health Connect
        val workouts = healthClient.fetchExerciseSessions(from, today)
        syncWorkouts(userId, workouts)
    }

    private suspend fun syncWorkouts(userId: String, workouts: List<WorkoutEntry>) {
        if (workouts.isEmpty()) return
        val rows = workouts.map { w ->
            mapOf(
                "user_id"      to userId,
                "external_id"  to w.externalId,
                "started_at"   to w.startTime.toString(),
                "ended_at"     to w.endTime.toString(),
                "type"         to w.activityType,
                "calories_out" to w.calories,
                "source"       to w.source
            ).filterValues { it != null }
        }
        supabase.postgrest["health_workouts"].upsert(rows, upsert = Upsert(onConflict = "user_id,external_id"))
    }

    /** Returns true if Health Connect is available on this device. */
    fun isHealthConnectAvailable(): Boolean = healthClient.isAvailable()
}
