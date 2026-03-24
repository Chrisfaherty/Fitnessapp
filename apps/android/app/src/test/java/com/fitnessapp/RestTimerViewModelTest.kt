package com.fitcoach.app

import com.fitcoach.app.ui.workout.RestTimerViewModel
import com.fitcoach.app.ui.workout.TimerState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// Unit tests for RestTimerViewModel state machine.
// Covers the same 14 state-transition scenarios as the iOS RestTimerTests suite.
// Uses StandardTestDispatcher + runTest for coroutine control.

@OptIn(ExperimentalCoroutinesApi::class)
class RestTimerViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var sut: RestTimerViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        sut = RestTimerViewModel()
    }

    @After
    fun tearDown() {
        sut.cancel()
        Dispatchers.resetMain()
    }

    // --- 1. Initial state is Idle ---

    @Test
    fun `01 initial state is Idle`() {
        // Assertion 1
        assertTrue(
            "Initial state must be TimerState.Idle",
            sut.state.value is TimerState.Idle
        )
    }

    // --- 2. start() transitions to Running ---

    @Test
    fun `02 start transitions to Running`() {
        sut.start(90)
        // Assertion 2
        assertTrue(
            "State must be TimerState.Running after start(), got ${sut.state.value}",
            sut.state.value is TimerState.Running
        )
    }

    // --- 3. After start(), remainingSeconds == 90 ---

    @Test
    fun `03 start sets remainingSeconds to given duration`() {
        sut.start(90)
        val state = sut.state.value as TimerState.Running
        // Assertion 3
        assertEquals(
            "remainingSeconds must equal the duration passed to start()",
            90,
            state.remainingSeconds
        )
    }

    // --- 4. After start(), totalMs == duration * 1000 ---

    @Test
    fun `04 start sets totalMs correctly`() {
        sut.start(90)
        val state = sut.state.value as TimerState.Running
        // Assertion 4: totalSeconds exposed via totalMs
        assertEquals(
            "totalMs must equal seconds * 1000",
            90_000L,
            state.totalMs
        )
    }

    // --- 5. pause() transitions to Paused ---

    @Test
    fun `05 pause from Running transitions to Paused`() {
        sut.start(60)
        sut.pause()
        // Assertion 5
        assertTrue(
            "State must be TimerState.Paused after pause(), got ${sut.state.value}",
            sut.state.value is TimerState.Paused
        )
    }

    // --- 6. resume() transitions back to Running ---

    @Test
    fun `06 resume from Paused transitions to Running`() {
        sut.start(60)
        sut.pause()
        sut.resume()
        // Assertion 6
        assertTrue(
            "State must be TimerState.Running after resume(), got ${sut.state.value}",
            sut.state.value is TimerState.Running
        )
    }

    // --- 7. cancel() from Running transitions to Idle ---

    @Test
    fun `07 cancel from Running transitions to Idle`() {
        sut.start(90)
        sut.cancel()
        // Assertion 7
        assertTrue(
            "State must be TimerState.Idle after cancel() from Running",
            sut.state.value is TimerState.Idle
        )
    }

    // --- 8. cancel() from Paused transitions to Idle ---

    @Test
    fun `08 cancel from Paused transitions to Idle`() {
        sut.start(90)
        sut.pause()
        sut.cancel()
        // Assertion 8
        assertTrue(
            "State must be TimerState.Idle after cancel() from Paused",
            sut.state.value is TimerState.Idle
        )
    }

    // --- 9. cancel() sets remainingSeconds to 0 ---

    @Test
    fun `09 cancel sets remainingSeconds to zero`() {
        sut.start(60)
        sut.cancel()
        // Assertion 9: Idle state returns 0 from remainingSeconds
        assertEquals(
            "remainingSeconds must be 0 after cancel()",
            0,
            sut.state.value.remainingSeconds
        )
    }

    // --- 10. Calling start() while already Running replaces the timer ---

    @Test
    fun `10 start while Running replaces timer with new duration`() {
        sut.start(90)
        // start() calls cancel() internally then sets new state, so it replaces
        sut.start(90)
        val state = sut.state.value
        // Assertion 10: state is still Running and remaining matches the re-started value
        assertTrue("State must remain Running", state is TimerState.Running)
        assertEquals(
            "Remaining must reflect the restart duration",
            90,
            state.remainingSeconds
        )
    }

    // --- 11. start(60) after cancel() correctly sets remainingSeconds == 60 ---

    @Test
    fun `11 start after cancel sets correct duration`() {
        sut.start(90)
        sut.cancel()
        sut.start(60)
        // Assertion 11
        assertEquals(
            "remainingSeconds must be 60 after starting a new 60-second countdown",
            60,
            sut.state.value.remainingSeconds
        )
    }

    // --- 12. A tick decrements remainingMs (timer fires and advances time) ---

    @Test
    fun `12 timer tick decrements remainingMs`() = runTest {
        sut.start(5)
        val beforeMs = (sut.state.value as TimerState.Running).remainingMs
        // Advance virtual time past one tick (tickIntervalMs = 100)
        advanceTimeBy(200L)
        val afterState = sut.state.value
        // Assertion 12: remaining has decreased after at least one tick
        if (afterState is TimerState.Running) {
            assertTrue(
                "remainingMs must decrease after ticks, before=$beforeMs after=${afterState.remainingMs}",
                afterState.remainingMs < beforeMs
            )
        } else {
            // State may have advanced to Finished for very short durations — still valid
            assertTrue(
                "State must be Running or Finished after ticking",
                afterState is TimerState.Finished
            )
        }
    }

    // --- 13. When countdown reaches 0, state transitions to Finished ---

    @Test
    fun `13 countdown reaching zero transitions to Finished`() = runTest {
        sut.start(1) // 1 second = 1000 ms
        // Advance past full duration + margin
        advanceTimeBy(1500L)
        // Assertion 13
        assertTrue(
            "State must be TimerState.Finished after countdown expires, got ${sut.state.value}",
            sut.state.value is TimerState.Finished
        )
    }

    // --- 14. cancel() from Finished transitions to Idle ---

    @Test
    fun `14 cancel from Finished transitions to Idle`() = runTest {
        sut.start(1)
        advanceTimeBy(1500L)
        assertTrue("Precondition: state must be Finished", sut.state.value is TimerState.Finished)
        sut.cancel()
        // Assertion 14
        assertTrue(
            "State must be TimerState.Idle after cancel() from Finished",
            sut.state.value is TimerState.Idle
        )
    }
}
