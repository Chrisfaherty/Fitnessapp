package com.fitnessapp.ui.checkin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
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
import kotlinx.datetime.Clock
import kotlinx.serialization.Serializable
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────

sealed class CheckInScreenState {
    object Loading : CheckInScreenState()
    data class Success(val checkIns: List<CheckInItem>) : CheckInScreenState()
    data class Error(val message: String) : CheckInScreenState()
}

data class CheckInItem(
    val id: String,
    val weekStart: String,
    val status: String,
    val bodyweightKg: Double?,
    val notes: String?,
    val trainerFeedback: String?,
    val createdAt: String
)

@HiltViewModel
class CheckInViewModel @Inject constructor(
    private val supabase: SupabaseClient
) : ViewModel() {
    private val _state = MutableStateFlow<CheckInScreenState>(CheckInScreenState.Loading)
    val state: StateFlow<CheckInScreenState> = _state.asStateFlow()

    var showSubmitDialog by mutableStateOf(false)
        private set

    init { loadCheckIns() }

    fun loadCheckIns() {
        viewModelScope.launch {
            _state.value = CheckInScreenState.Loading
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id
                    ?: throw IllegalStateException("Not authenticated")
                val rows = supabase.postgrest["check_ins"]
                    .select {
                        filter { eq("client_id", userId) }
                        order("week_start", Order.DESCENDING)
                        limit(20)
                    }
                    .decodeList<CheckInRow>()

                _state.value = CheckInScreenState.Success(rows.map {
                    CheckInItem(
                        id = it.id,
                        weekStart = it.week_start,
                        status = it.status,
                        bodyweightKg = it.bodyweight_kg,
                        notes = it.notes,
                        trainerFeedback = it.trainer_feedback,
                        createdAt = it.created_at
                    )
                })
            } catch (e: Exception) {
                _state.value = CheckInScreenState.Error(e.message ?: "Failed to load check-ins")
            }
        }
    }

    fun openSubmitDialog() { showSubmitDialog = true }
    fun closeSubmitDialog() { showSubmitDialog = false }

    fun submitCheckIn(bodyweight: Double?, notes: String) {
        viewModelScope.launch {
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id ?: return@launch
                // week_start = Monday of current week
                val now = Clock.System.now()
                supabase.postgrest["check_ins"].insert(
                    mapOf(
                        "client_id"      to userId,
                        "week_start"     to now.toString().substring(0, 10),
                        "bodyweight_kg"  to bodyweight,
                        "notes"          to notes.ifBlank { null },
                        "status"         to "submitted"
                    ).filterValues { it != null }
                )
                closeSubmitDialog()
                loadCheckIns()
            } catch (_: Exception) { }
        }
    }
}

@Serializable
private data class CheckInRow(
    val id: String,
    val week_start: String,
    val status: String,
    val bodyweight_kg: Double? = null,
    val notes: String? = null,
    val trainer_feedback: String? = null,
    val created_at: String
)

// ─── Screen ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckInScreen(viewModel: CheckInViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (viewModel.showSubmitDialog) {
        SubmitCheckInDialog(
            onDismiss = viewModel::closeSubmitDialog,
            onSubmit = viewModel::submitCheckIn
        )
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Weekly Check-In") }) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = viewModel::openSubmitDialog,
                containerColor = FitnessColors.Accent
            ) {
                Icon(Icons.Default.Add, contentDescription = "New check-in",
                    tint = MaterialTheme.colorScheme.background)
            }
        }
    ) { padding ->
        when (val s = state) {
            is CheckInScreenState.Loading -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { CircularProgressIndicator(color = FitnessColors.Accent) }

            is CheckInScreenState.Success -> LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (s.checkIns.isEmpty()) {
                    item {
                        Text("No check-ins yet. Submit your first weekly check-in!",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 32.dp))
                    }
                } else {
                    items(s.checkIns, key = { it.id }) { ci ->
                        CheckInCard(ci)
                    }
                }
            }

            is CheckInScreenState.Error -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { Text(s.message, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun CheckInCard(item: CheckInItem) {
    val isReviewed = item.status == "reviewed"
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isReviewed)
                FitnessColors.Accent.copy(alpha = 0.06f)
            else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (isReviewed) Icons.Default.CheckCircle else Icons.Default.Schedule,
                    contentDescription = null,
                    tint = if (isReviewed) FitnessColors.Accent
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text("Week of ${item.weekStart}", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.weight(1f))
                Text(item.status.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item.bodyweightKg?.let {
                Spacer(Modifier.height(8.dp))
                Text("Weight: ${String.format("%.1f", it)} kg",
                    style = MaterialTheme.typography.bodySmall)
            }
            item.notes?.let {
                Spacer(Modifier.height(4.dp))
                Text(it, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            item.trainerFeedback?.let {
                Spacer(Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(Modifier.height(8.dp))
                Text("Trainer Feedback", style = MaterialTheme.typography.labelSmall,
                    color = FitnessColors.Accent)
                Text(it, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun SubmitCheckInDialog(
    onDismiss: () -> Unit,
    onSubmit: (bodyweight: Double?, notes: String) -> Unit
) {
    var bodyweight by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Weekly Check-In") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = bodyweight, onValueChange = { bodyweight = it },
                    label = { Text("Current weight (kg)") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = notes, onValueChange = { notes = it },
                    label = { Text("How was your week?") }, minLines = 4,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(bodyweight.toDoubleOrNull(), notes) }) {
                Text("Submit")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
