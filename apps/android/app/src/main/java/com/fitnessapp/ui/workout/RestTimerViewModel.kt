package com.fitnessapp.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

// ============================================================
// RestTimerViewModel — state machine for rest timer
// States: Idle → Running ↔ Paused → Finished → Idle
// ============================================================

sealed class TimerState {
    object Idle : TimerState()
    data class Running(val remainingMs: Long, val totalMs: Long) : TimerState()
    data class Paused(val remainingMs: Long, val totalMs: Long) : TimerState()
    object Finished : TimerState()

    val isActive: Boolean get() = this is Running || this is Paused

    val remainingSeconds: Int get() = when (this) {
        is Running -> (remainingMs / 1000).toInt()
        is Paused  -> (remainingMs / 1000).toInt()
        else       -> 0
    }

    val progress: Float get() = when (this) {
        is Running -> if (totalMs > 0) 1f - remainingMs.toFloat() / totalMs.toFloat() else 0f
        is Paused  -> if (totalMs > 0) 1f - remainingMs.toFloat() / totalMs.toFloat() else 0f
        else       -> 0f
    }
}

class RestTimerViewModel : ViewModel() {

    private val _state = MutableStateFlow<TimerState>(TimerState.Idle)
    val state: StateFlow<TimerState> = _state.asStateFlow()

    private var tickJob: Job? = null
    private val tickIntervalMs = 100L

    var onFinished: (() -> Unit)? = null

    // MARK: - Commands

    fun start(seconds: Int) {
        cancel()
        val totalMs = seconds * 1000L
        _state.value = TimerState.Running(totalMs, totalMs)
        scheduleTimer()
    }

    fun pause() {
        val current = _state.value as? TimerState.Running ?: return
        tickJob?.cancel()
        tickJob = null
        _state.value = TimerState.Paused(current.remainingMs, current.totalMs)
    }

    fun resume() {
        val current = _state.value as? TimerState.Paused ?: return
        _state.value = TimerState.Running(current.remainingMs, current.totalMs)
        scheduleTimer()
    }

    fun addTime(deltaSeconds: Int) {
        val deltaMs = deltaSeconds * 1000L
        when (val current = _state.value) {
            is TimerState.Running -> {
                val newRemaining = maxOf(1000L, current.remainingMs + deltaMs)
                val newTotal = maxOf(current.totalMs, newRemaining)
                _state.value = TimerState.Running(newRemaining, newTotal)
            }
            is TimerState.Paused -> {
                val newRemaining = maxOf(1000L, current.remainingMs + deltaMs)
                val newTotal = maxOf(current.totalMs, newRemaining)
                _state.value = TimerState.Paused(newRemaining, newTotal)
            }
            else -> Unit
        }
    }

    fun skip() {
        cancel()
    }

    fun cancel() {
        tickJob?.cancel()
        tickJob = null
        _state.value = TimerState.Idle
    }

    // MARK: - Private

    private fun scheduleTimer() {
        tickJob = viewModelScope.launch {
            while (true) {
                delay(tickIntervalMs)
                val current = _state.value as? TimerState.Running ?: break
                val nextMs = current.remainingMs - tickIntervalMs
                if (nextMs <= 0) {
                    _state.value = TimerState.Finished
                    onFinished?.invoke()
                    break
                } else {
                    _state.value = TimerState.Running(nextMs, current.totalMs)
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        tickJob?.cancel()
    }
}
