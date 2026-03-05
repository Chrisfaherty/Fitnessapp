package com.fitnessapp.ui.messaging

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import io.github.jan.supabase.realtime.PostgresAction
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import javax.inject.Inject

// ─── State & ViewModel ───────────────────────────────────────────────────────

sealed class MessagingState {
    object Loading : MessagingState()
    data class Success(val conversationId: String, val messages: List<MessageItem>) : MessagingState()
    data class Error(val message: String) : MessagingState()
}

data class MessageItem(
    val id: String,
    val senderId: String,
    val body: String?,
    val videoStoragePath: String?,
    val isOwn: Boolean,
    val sentAt: String
)

@Serializable private data class ConversationRow(val id: String, val client_id: String, val trainer_id: String)
@Serializable private data class MessageRow(
    val id: String,
    val conversation_id: String,
    val sender_id: String,
    val body: String? = null,
    val video_storage_path: String? = null,
    val sent_at: String
)

@HiltViewModel
class MessagingViewModel @Inject constructor(
    private val supabase: SupabaseClient
) : ViewModel() {
    private val _state = MutableStateFlow<MessagingState>(MessagingState.Loading)
    val state: StateFlow<MessagingState> = _state.asStateFlow()

    private var conversationId: String? = null
    private var currentUserId: String? = null

    init { loadOrCreateConversation() }

    private fun loadOrCreateConversation() {
        viewModelScope.launch {
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id
                    ?: throw IllegalStateException("Not authenticated")
                currentUserId = userId

                val convo = supabase.postgrest["conversations"]
                    .select { filter { eq("client_id", userId) } }
                    .decodeList<ConversationRow>()
                    .firstOrNull()
                    ?: throw IllegalStateException("No conversation found. Contact your trainer.")

                conversationId = convo.id
                loadMessages(convo.id, userId)
                subscribeToRealtime(convo.id, userId)
            } catch (e: Exception) {
                _state.value = MessagingState.Error(e.message ?: "Failed to load messages")
            }
        }
    }

    private suspend fun loadMessages(convId: String, userId: String) {
        val rows = supabase.postgrest["messages"]
            .select {
                filter { eq("conversation_id", convId) }
                order("sent_at", Order.ASCENDING)
                limit(100)
            }
            .decodeList<MessageRow>()

        _state.value = MessagingState.Success(
            conversationId = convId,
            messages = rows.map {
                MessageItem(it.id, it.sender_id, it.body, it.video_storage_path,
                    it.sender_id == userId, it.sent_at)
            }
        )
    }

    private fun subscribeToRealtime(convId: String, userId: String) {
        viewModelScope.launch {
            val channel = supabase.realtime.channel("messages-$convId")
            channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
                table = "messages"
                filter = "conversation_id=eq.$convId"
            }.onEach { action ->
                val current = _state.value as? MessagingState.Success ?: return@onEach
                val row = action.record
                val newMsg = MessageItem(
                    id = row["id"]?.toString()?.trim('"') ?: return@onEach,
                    senderId = row["sender_id"]?.toString()?.trim('"') ?: return@onEach,
                    body = row["body"]?.toString()?.trim('"'),
                    videoStoragePath = row["video_storage_path"]?.toString()?.trim('"'),
                    isOwn = row["sender_id"]?.toString()?.trim('"') == userId,
                    sentAt = row["sent_at"]?.toString()?.trim('"') ?: ""
                )
                if (current.messages.none { it.id == newMsg.id }) {
                    _state.value = current.copy(messages = current.messages + newMsg)
                }
            }.launchIn(viewModelScope)
            channel.subscribe()
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return
        val convId = conversationId ?: return
        val userId = currentUserId ?: return
        viewModelScope.launch {
            runCatching {
                supabase.postgrest["messages"].insert(
                    mapOf("conversation_id" to convId, "sender_id" to userId, "body" to text.trim())
                )
            }
        }
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessagingScreen(viewModel: MessagingViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    val messages = (state as? MessagingState.Success)?.messages
    LaunchedEffect(messages?.size) {
        messages?.let { if (it.isNotEmpty()) listState.animateScrollToItem(it.lastIndex) }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Messages") }) },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(8.dp).navigationBarsPadding(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("Message…") },
                        modifier = Modifier.weight(1f),
                        maxLines = 4,
                        shape = RoundedCornerShape(24.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(
                        onClick = { viewModel.sendMessage(inputText); inputText = "" },
                        enabled = inputText.isNotBlank(),
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(
                                if (inputText.isNotBlank()) FitnessColors.Accent
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send, "Send",
                            tint = if (inputText.isNotBlank()) MaterialTheme.colorScheme.background
                            else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    ) { padding ->
        when (val s = state) {
            is MessagingState.Loading -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { CircularProgressIndicator(color = FitnessColors.Accent) }

            is MessagingState.Success -> LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(s.messages, key = { it.id }) { msg -> MessageBubble(msg) }
            }

            is MessagingState.Error -> Box(
                Modifier.fillMaxSize().padding(padding), Alignment.Center
            ) { Text(s.message, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@Composable
private fun MessageBubble(message: MessageItem) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (message.isOwn) Alignment.End else Alignment.Start
    ) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(
                    if (message.isOwn) FitnessColors.Accent.copy(alpha = 0.9f)
                    else MaterialTheme.colorScheme.surfaceVariant
                )
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .widthIn(max = 280.dp)
        ) {
            Text(
                if (message.videoStoragePath != null) "🎥 Video message" else (message.body ?: ""),
                color = if (message.isOwn) MaterialTheme.colorScheme.background
                else MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        Text(
            message.sentAt.take(16).replace("T", " "),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
        )
    }
}
