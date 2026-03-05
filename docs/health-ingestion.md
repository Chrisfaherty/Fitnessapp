# Health Data Ingestion

## Overview

Health data flows from the device's OS health API into Supabase via the mobile apps. The pipeline is designed to be safe for repeated calls — every write is an upsert.

## iOS — HealthKit

### Permission Request
```swift
// HealthKitClient.swift
let typesToRead: Set<HKObjectType> = [
    HKQuantityType(.stepCount),
    HKQuantityType(.activeEnergyBurned),
    HKQuantityType(.bodyMass),
    HKQuantityType(.dietaryProtein),
    HKQuantityType(.dietaryCarbohydrates),
    HKQuantityType(.dietaryFatTotal),
    HKQuantityType(.dietaryWater),
    HKCategoryType(.sleepAnalysis),
]
try await store.requestAuthorization(toShare: [], read: typesToRead)
```

### Daily Metrics Query
Uses `HKStatisticsCollectionQuery` with a 1-day interval to aggregate data per calendar day. Returns a `[String: Double]` map keyed by ISO date string (`"2026-03-02"`).

```swift
func fetchDailyMetrics(from startDate: Date, to endDate: Date) async throws -> [DailyMetrics]
```

### Sync Flow
```
FitnessCoachApp.onForeground()
  → SyncService.syncIfNeeded()
  → HealthKitClient.fetchDailyMetrics(last 7 days)
  → supabase.from("health_daily").upsert(rows, onConflict: "user_id,date")
  → HealthKitClient.fetchWorkouts(last 7 days)
  → supabase.from("health_workouts").upsert(rows, onConflict: "user_id,external_id")
```

### Deduplication
- `health_daily`: `UNIQUE(user_id, date)` — upsert with `ON CONFLICT DO UPDATE` merges new values
- `health_workouts`: `UNIQUE(user_id, external_id)` — `external_id` is the HKWorkout UUID

## Android — Health Connect

### Availability Check
```kotlin
fun isAvailable(): Boolean {
    return HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
}
```

### Permission Request
Required permissions declared in `AndroidManifest.xml`:
- `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_WEIGHT`
- `READ_NUTRITION`, `READ_EXERCISE`, `READ_SLEEP`

### Daily Steps Query
```kotlin
// Groups by 1-day buckets using AggregateGroupByDurationRequest
val request = AggregateGroupByDurationRequest(
    metrics = setOf(StepsRecord.COUNT_TOTAL),
    timeRangeFilter = TimeRangeFilter.between(startInstant, endInstant),
    timeRangeSlicer = Duration.ofDays(1)
)
```

### Sync Flow
```
DashboardViewModel.init()
  → launch { SyncRepository.syncHealthData(7) }  // background coroutine
  → HealthConnectHealthDataClient.fetchDailyMetrics(from, to)
  → supabase["health_daily"].upsert(rows)
  → HealthConnectHealthDataClient.fetchExerciseSessions(from, to)
  → supabase["health_workouts"].upsert(rows)
```

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Health Connect not installed | `isAvailable()` returns false; sync skipped gracefully |
| Permission denied | Caught as exception; metrics skipped; no crash |
| Partial day data | Upserted with available fields; NULLs preserved |
| Multiple syncs same day | Upsert with conflict resolution merges values |
| Time zone change | Date strings computed in device local time zone |

## Weekly Aggregation

The `weeklySummary` Deno edge function runs every Sunday at 23:00 UTC (configured in `supabase/config.toml`):

```typescript
// Per client, per target week:
const { data } = await supabase
  .from('health_daily')
  .select('steps, calories_out, protein_g, weight_kg')
  .eq('user_id', clientId)
  .gte('date', weekStart)
  .lte('date', weekEnd)

// Compute averages, upsert to weekly_summaries
```

Trainers can review weekly summaries in the trainer dashboard's client detail view.
