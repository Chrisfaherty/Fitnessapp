package com.fitnessapp.ui.meals

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.fitnessapp.ui.theme.FitnessColors
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────

sealed class MealPlanState {
    object Loading : MealPlanState()
    data class Success(val plans: List<MealPlanItem>) : MealPlanState()
    data class Error(val message: String) : MealPlanState()
}

data class MealPlanDay(
    val dayLabel: String,
    val meals: String?,
    val totalCalories: Int?,
    val proteinG: Int?,
    val carbsG: Int?,
    val fatG: Int?
)

data class MealPlanItem(
    val id: String,
    val title: String,
    val notes: String?,
    val startDate: String?,
    val endDate: String?,
    val days: List<MealPlanDay>
)

@HiltViewModel
class MealPlanViewModel @Inject constructor(
    private val supabase: SupabaseClient
) : ViewModel() {
    private val _state = MutableStateFlow<MealPlanState>(MealPlanState.Loading)
    val state: StateFlow<MealPlanState> = _state.asStateFlow()

    var expandedPlanId by mutableStateOf<String?>(null)
        private set

    init { loadMealPlans() }

    fun loadMealPlans() {
        viewModelScope.launch {
            _state.value = MealPlanState.Loading
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id
                    ?: throw IllegalStateException("Not authenticated")

                val plans = supabase.postgrest["meal_plans"]
                    .select {
                        filter { eq("client_id", userId) }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<MealPlanRow>()

                val items = plans.map { plan ->
                    val days = supabase.postgrest["meal_plan_days"]
                        .select {
                            filter { eq("meal_plan_id", plan.id) }
                            order("day_label")
                        }
                        .decodeList<MealPlanDayRow>()
                        .map { d ->
                            MealPlanDay(
                                dayLabel = d.day_label,
                                meals = d.meals,
                                totalCalories = d.total_calories,
                                proteinG = d.protein_g,
                                carbsG = d.carbs_g,
                                fatG = d.fat_g
                            )
                        }
                    MealPlanItem(
                        id = plan.id,
                        title = plan.title,
                        notes = plan.notes,
                        startDate = plan.start_date,
                        endDate = plan.end_date,
                        days = days
                    )
                }

                _state.value = MealPlanState.Success(items)
            } catch (e: Exception) {
                _state.value = MealPlanState.Error(e.message ?: "Failed to load meal plans")
            }
        }
    }

    fun toggleExpand(planId: String) {
        expandedPlanId = if (expandedPlanId == planId) null else planId
    }
}

@Serializable
private data class MealPlanRow(
    val id: String,
    val title: String,
    val notes: String? = null,
    val start_date: String? = null,
    val end_date: String? = null
)

@Serializable
private data class MealPlanDayRow(
    val id: String,
    val meal_plan_id: String,
    val day_label: String,
    val meals: String? = null,
    val total_calories: Int? = null,
    val protein_g: Int? = null,
    val carbs_g: Int? = null,
    val fat_g: Int? = null
)

// ─── Screen ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealPlanScreen(viewModel: MealPlanViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(topBar = { TopAppBar(title = { Text("Meal Plans") }) }) { padding ->
        when (val s = state) {
            is MealPlanState.Loading -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { CircularProgressIndicator(color = FitnessColors.Accent) }

            is MealPlanState.Success -> {
                if (s.plans.isEmpty()) {
                    Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                        Text("No meal plans yet. Your trainer will add one here.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.padding(padding),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(s.plans, key = { it.id }) { plan ->
                            MealPlanCard(
                                plan = plan,
                                expanded = viewModel.expandedPlanId == plan.id,
                                onToggle = { viewModel.toggleExpand(plan.id) }
                            )
                        }
                    }
                }
            }

            is MealPlanState.Error -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { Text(s.message, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun MealPlanCard(plan: MealPlanItem, expanded: Boolean, onToggle: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Header (always visible)
            Surface(onClick = onToggle, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(plan.title, style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.weight(1f))
                        Text(if (expanded) "▲" else "▼",
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    plan.startDate?.let { start ->
                        val range = plan.endDate?.let { " → $it" } ?: ""
                        Text("$start$range",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    plan.notes?.let {
                        Spacer(Modifier.height(4.dp))
                        Text(it, style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            // Expanded days
            if (expanded && plan.days.isNotEmpty()) {
                HorizontalDivider()
                plan.days.forEach { day ->
                    MealDayRow(day)
                    HorizontalDivider(thickness = 0.5.dp)
                }
            }
        }
    }
}

@Composable
private fun MealDayRow(day: MealPlanDay) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text(day.dayLabel, style = MaterialTheme.typography.labelMedium,
            color = FitnessColors.Accent)
        Spacer(Modifier.height(4.dp))
        day.meals?.let {
            Text(it, style = MaterialTheme.typography.bodySmall)
        }
        // Macro summary
        val macros = listOfNotNull(
            day.totalCalories?.let { "${it} kcal" },
            day.proteinG?.let { "P ${it}g" },
            day.carbsG?.let { "C ${it}g" },
            day.fatG?.let { "F ${it}g" }
        )
        if (macros.isNotEmpty()) {
            Spacer(Modifier.height(4.dp))
            Text(macros.joinToString(" · "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
