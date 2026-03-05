package com.fitnessapp.ui.diary

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.todayIn
import kotlinx.serialization.Serializable
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────

sealed class DiaryState {
    object Loading : DiaryState()
    data class Success(val entries: List<DiaryEntry>) : DiaryState()
    data class Error(val message: String) : DiaryState()
}

data class DiaryEntry(
    val id: String,
    val date: String,
    val mood: Int?,
    val energyLevel: Int?,
    val sleepHours: Double?,
    val notes: String?,
    val createdAt: String
)

@HiltViewModel
class DiaryViewModel @Inject constructor(
    private val supabase: SupabaseClient
) : ViewModel() {
    private val _state = MutableStateFlow<DiaryState>(DiaryState.Loading)
    val state: StateFlow<DiaryState> = _state.asStateFlow()

    var showAddDialog by mutableStateOf(false)
        private set

    init { loadEntries() }

    fun loadEntries() {
        viewModelScope.launch {
            _state.value = DiaryState.Loading
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id
                    ?: throw IllegalStateException("Not authenticated")
                val rows = supabase.postgrest["diary_entries"]
                    .select {
                        filter { eq("user_id", userId) }
                        order("date", Order.DESCENDING)
                        limit(30)
                    }
                    .decodeList<DiaryRow>()

                _state.value = DiaryState.Success(rows.map {
                    DiaryEntry(it.id, it.date, it.mood, it.energy_level, it.sleep_hours, it.notes, it.created_at)
                })
            } catch (e: Exception) {
                _state.value = DiaryState.Error(e.message ?: "Failed to load diary")
            }
        }
    }

    fun openAddDialog() { showAddDialog = true }
    fun closeAddDialog() { showAddDialog = false }

    fun saveEntry(mood: Int?, energy: Int?, sleep: Double?, notes: String) {
        viewModelScope.launch {
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id ?: return@launch
                val today = Clock.System.todayIn(TimeZone.currentSystemDefault()).toString()
                supabase.postgrest["diary_entries"].upsert(
                    mapOf(
                        "user_id"      to userId,
                        "date"         to today,
                        "mood"         to mood,
                        "energy_level" to energy,
                        "sleep_hours"  to sleep,
                        "notes"        to notes.ifBlank { null }
                    ).filterValues { it != null },
                )
                closeAddDialog()
                loadEntries()
            } catch (_: Exception) { }
        }
    }
}

@Serializable
private data class DiaryRow(
    val id: String,
    val date: String,
    val mood: Int? = null,
    val energy_level: Int? = null,
    val sleep_hours: Double? = null,
    val notes: String? = null,
    val created_at: String
)

// ─── Screen ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiaryScreen(viewModel: DiaryViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (viewModel.showAddDialog) {
        AddDiaryEntryDialog(
            onDismiss = viewModel::closeAddDialog,
            onSave = viewModel::saveEntry
        )
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Daily Diary") }) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = viewModel::openAddDialog,
                containerColor = FitnessColors.Accent
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add entry",
                    tint = MaterialTheme.colorScheme.background)
            }
        }
    ) { padding ->
        when (val s = state) {
            is DiaryState.Loading -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { CircularProgressIndicator(color = FitnessColors.Accent) }

            is DiaryState.Success -> LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (s.entries.isEmpty()) {
                    item {
                        Text(
                            "No diary entries yet. Tap + to add today's entry.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 32.dp).fillMaxWidth(),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                } else {
                    items(s.entries, key = { it.id }) { entry ->
                        DiaryEntryCard(entry)
                    }
                }
            }

            is DiaryState.Error -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { Text(s.message, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun DiaryEntryCard(entry: DiaryEntry) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(entry.date, style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                entry.mood?.let { MoodChip("Mood", it) }
                entry.energyLevel?.let { MoodChip("Energy", it) }
                entry.sleepHours?.let {
                    Text(
                        "Sleep ${String.format("%.1f", it)}h",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            entry.notes?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun MoodChip(label: String, value: Int) {
    val emoji = when {
        value >= 8 -> "😄"
        value >= 5 -> "😐"
        else -> "😟"
    }
    Text("$label $emoji $value/10",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun AddDiaryEntryDialog(
    onDismiss: () -> Unit,
    onSave: (mood: Int?, energy: Int?, sleep: Double?, notes: String) -> Unit
) {
    var mood by remember { mutableStateOf("") }
    var energy by remember { mutableStateOf("") }
    var sleep by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Today's Entry") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = mood, onValueChange = { mood = it },
                    label = { Text("Mood (1–10)") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = energy, onValueChange = { energy = it },
                    label = { Text("Energy (1–10)") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = sleep, onValueChange = { sleep = it },
                    label = { Text("Sleep (hours)") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = notes, onValueChange = { notes = it },
                    label = { Text("Notes") }, minLines = 3,
                    modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    mood.toIntOrNull()?.coerceIn(1, 10),
                    energy.toIntOrNull()?.coerceIn(1, 10),
                    sleep.toDoubleOrNull(),
                    notes
                )
            }) { Text("Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
