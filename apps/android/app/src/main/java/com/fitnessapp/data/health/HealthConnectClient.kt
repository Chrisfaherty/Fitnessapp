package com.fitnessapp.data.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateGroupByDurationRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.fitnessapp.data.model.DailyMetrics
import com.fitnessapp.data.model.WorkoutEvent
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class HealthConnectHealthDataClient(private val context: Context) : HealthDataClient {

    private val client by lazy { HealthConnectClient.getOrCreate(context) }
    private val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val zone = ZoneId.systemDefault()

    override suspend fun isAvailable(): Boolean {
        return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    }

    override suspend fun hasPermissions(): Boolean {
        return try {
            client.permissionController.getGrantedPermissions()
                .containsAll(requiredPermissions())
        } catch (e: Exception) { false }
    }

    override fun requiredPermissions(): Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    )

    override suspend fun fetchDailySteps(startDate: String, endDate: String): Map<String, Long> {
        val start = LocalDate.parse(startDate, fmt).atStartOfDay(zone).toInstant()
        val end   = LocalDate.parse(endDate, fmt).plusDays(1).atStartOfDay(zone).toInstant()

        val request = AggregateGroupByDurationRequest(
            metrics = setOf(StepsRecord.COUNT_TOTAL),
            timeRangeFilter = TimeRangeFilter.between(start, end),
            timeRangeSlicer = Duration.ofDays(1)
        )
        return try {
            val results = client.aggregateGroupByDuration(request)
            results.associate { bucket ->
                val day = bucket.startTime.atZone(zone).toLocalDate().format(fmt)
                val steps = bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L
                day to steps
            }
        } catch (e: Exception) { emptyMap() }
    }

    override suspend fun fetchDailyWeight(startDate: String, endDate: String): Map<String, Double> {
        val start = LocalDate.parse(startDate, fmt).atStartOfDay(zone).toInstant()
        val end   = LocalDate.parse(endDate, fmt).plusDays(1).atStartOfDay(zone).toInstant()

        return try {
            val response = client.readRecords(
                ReadRecordsRequest(
                    WeightRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            // Latest record per day
            response.records
                .groupBy { it.time.atZone(zone).toLocalDate().format(fmt) }
                .mapValues { (_, records) -> records.maxByOrNull { it.time }!!.weight.inKilograms }
        } catch (e: Exception) { emptyMap() }
    }

    override suspend fun fetchExerciseSessions(startDate: String, endDate: String): List<WorkoutEvent> {
        val start = LocalDate.parse(startDate, fmt).atStartOfDay(zone).toInstant()
        val end   = LocalDate.parse(endDate, fmt).plusDays(1).atStartOfDay(zone).toInstant()

        return try {
            val response = client.readRecords(
                ReadRecordsRequest(
                    ExerciseSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            response.records.map { session ->
                val packageName = session.metadata.dataOrigin.packageName
                WorkoutEvent(
                    userId = "",  // filled by SyncRepository
                    externalId = session.metadata.id,
                    workoutType = session.exerciseType.name,
                    startAt = session.startTime.toString(),
                    endAt = session.endTime.toString(),
                    kcal = null,  // separate calorie record lookup needed
                    sourceApp = packageName,
                    sourceBundle = packageName
                )
            }
        } catch (e: Exception) { emptyList() }
    }

    override suspend fun fetchDailyNutrition(startDate: String, endDate: String): Map<String, NutritionTotals> {
        val start = LocalDate.parse(startDate, fmt).atStartOfDay(zone).toInstant()
        val end   = LocalDate.parse(endDate, fmt).plusDays(1).atStartOfDay(zone).toInstant()

        return try {
            val response = client.readRecords(
                ReadRecordsRequest(
                    NutritionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end)
                )
            )
            response.records
                .groupBy { it.startTime.atZone(zone).toLocalDate().format(fmt) }
                .mapValues { (_, records) ->
                    NutritionTotals(
                        kcal    = records.sumOf { it.energy?.inKilocalories ?: 0.0 }.takeIf { it > 0 },
                        proteinG = records.sumOf { it.protein?.inGrams ?: 0.0 }.takeIf { it > 0 },
                        carbsG   = records.sumOf { it.totalCarbohydrate?.inGrams ?: 0.0 }.takeIf { it > 0 },
                        fatG     = records.sumOf { it.totalFat?.inGrams ?: 0.0 }.takeIf { it > 0 },
                        source   = records.firstOrNull()?.metadata?.dataOrigin?.packageName
                    )
                }
        } catch (e: Exception) { emptyMap() }
    }

    override suspend fun fetchDailyMetrics(startDate: String, endDate: String): List<DailyMetrics> {
        val steps   = fetchDailySteps(startDate, endDate)
        val weight  = fetchDailyWeight(startDate, endDate)
        val nutrition = fetchDailyNutrition(startDate, endDate)

        val start = LocalDate.parse(startDate, fmt)
        val end   = LocalDate.parse(endDate, fmt)

        val result = mutableListOf<DailyMetrics>()
        var current = start
        while (!current.isAfter(end)) {
            val dateStr = current.format(fmt)
            val nutr = nutrition[dateStr]
            val sources = buildList {
                add("Health Connect")
                nutr?.source?.let { add(it) }
            }
            result.add(DailyMetrics(
                userId = "",  // filled by SyncRepository
                date = dateStr,
                steps = steps[dateStr]?.toInt(),
                weightKg = weight[dateStr],
                nutritionKcal = nutr?.kcal,
                proteinG = nutr?.proteinG,
                carbsG = nutr?.carbsG,
                fatG = nutr?.fatG,
                sources = sources
            ))
            current = current.plusDays(1)
        }
        return result
    }
}
