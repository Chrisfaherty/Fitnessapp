package com.fitnessapp.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fitnessapp.data.health.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.todayIn
import kotlinx.serialization.Serializable
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val syncRepository: SyncRepository
) : ViewModel() {

    private val _state = MutableStateFlow<DashboardState>(DashboardState.Loading)
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _state.value = DashboardState.Loading
            try {
                // Trigger background health sync
                launch { runCatching { syncRepository.syncHealthData(7) } }

                val userId = supabase.gotrue.currentUserOrNull()?.id
                    ?: throw IllegalStateException("Not authenticated")

                val today = Clock.System.todayIn(TimeZone.currentSystemDefault())
                val weekAgo = today.minus(6, DateTimeUnit.DAY)

                // Fetch last 7 days of health_daily
                val healthRows = supabase.postgrest["health_daily"]
                    .select {
                        filter {
                            eq("user_id", userId)
                            gte("date", weekAgo.toString())
                            lte("date", today.toString())
                        }
                    }
                    .decodeList<HealthDailyRow>()

                val avgSteps = healthRows.mapNotNull { it.steps?.toDouble() }
                    .takeIf { it.isNotEmpty() }?.average()
                val avgCalories = healthRows.mapNotNull { it.calories_out?.toDouble() }
                    .takeIf { it.isNotEmpty() }?.average()
                val latestWeight = healthRows
                    .sortedByDescending { it.date }
                    .firstNotNullOfOrNull { it.weight_kg?.toDouble() }

                // Count workout sessions this week
                val workoutsThisWeek = supabase.postgrest["workout_sessions"]
                    .select {
                        filter {
                            eq("client_id", userId)
                            gte("performed_at", "${weekAgo}T00:00:00Z")
                        }
                        count()
                    }
                    .countOrNull()?.toInt() ?: 0

                _state.value = DashboardState.Success(
                    avgSteps = avgSteps,
                    avgCalories = avgCalories,
                    latestWeight = latestWeight,
                    workoutsThisWeek = workoutsThisWeek
                )
            } catch (e: Exception) {
                _state.value = DashboardState.Error(e.message ?: "Failed to load dashboard")
            }
        }
    }

    fun refresh() = loadDashboard()
}

@Serializable
private data class HealthDailyRow(
    val date: String,
    val steps: Long? = null,
    val calories_out: Double? = null,
    val weight_kg: Double? = null
)
