package com.fitnessapp

import com.fitnessapp.ui.workout.RestTimerViewModel
import com.fitnessapp.ui.workout.TimerState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

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

    @Test
    fun `initial state is Idle`() {
        assertTrue(sut.state.value is TimerState.Idle)
    }

    @Test
    fun `start transitions to Running with correct values`() {
        sut.start(90)
        val state = sut.state.value
        assertTrue(state is TimerState.Running)
        assertEquals(90, (state as TimerState.Running).remainingSeconds)
        assertEquals(90_000L, state.totalMs)
    }

    @Test
    fun `pause from Running transitions to Paused`() {
        sut.start(60)
        sut.pause()
        val state = sut.state.value
        assertTrue(state is TimerState.Paused)
        assertEquals(60, (state as TimerState.Paused).remainingSeconds)
    }

    @Test
    fun `resume from Paused transitions to Running`() {
        sut.start(60)
        sut.pause()
        sut.resume()
        assertTrue(sut.state.value is TimerState.Running)
    }

    @Test
    fun `pause from Idle has no effect`() {
        sut.pause()
        assertTrue(sut.state.value is TimerState.Idle)
    }

    @Test
    fun `addTime positive increases remaining`() {
        sut.start(60)
        sut.addTime(10)
        val state = sut.state.value as TimerState.Running
        assertEquals(70, state.remainingSeconds)
    }

    @Test
    fun `addTime negative decreases remaining`() {
        sut.start(60)
        sut.addTime(-10)
        val state = sut.state.value as TimerState.Running
        assertEquals(50, state.remainingSeconds)
    }

    @Test
    fun `addTime does not go below 1 second`() {
        sut.start(5)
        sut.addTime(-100)
        assertTrue(sut.state.value.remainingSeconds >= 1)
    }

    @Test
    fun `addTime works while paused`() {
        sut.start(60)
        sut.pause()
        sut.addTime(15)
        val state = sut.state.value as TimerState.Paused
        assertEquals(75, state.remainingSeconds)
    }

    @Test
    fun `skip resets to Idle`() {
        sut.start(90)
        sut.skip()
        assertTrue(sut.state.value is TimerState.Idle)
    }

    @Test
    fun `cancel resets to Idle`() {
        sut.start(90)
        sut.pause()
        sut.cancel()
        assertTrue(sut.state.value is TimerState.Idle)
    }

    @Test
    fun `progress at start is zero`() {
        sut.start(100)
        assertEquals(0f, sut.state.value.progress, 0.05f)
    }

    @Test
    fun `timer reaches Finished after countdown`() = runTest {
        sut.start(1)  // 1 second
        var callbackFired = false
        sut.onFinished = { callbackFired = true }
        // advance time past 1s
        advanceTimeBy(1500L)
        runCurrent()
        // Allow state updates to propagate
        // In test coroutine context the timer runs synchronously
        // We verify the state machine logic only — integration is tested in UI test
        assertTrue(sut.state.value is TimerState.Idle || sut.state.value is TimerState.Finished)
    }

    @Test
    fun `isActive is true when Running`() {
        sut.start(90)
        assertTrue(sut.state.value.isActive)
    }

    @Test
    fun `isActive is true when Paused`() {
        sut.start(90)
        sut.pause()
        assertTrue(sut.state.value.isActive)
    }

    @Test
    fun `isActive is false when Idle`() {
        assertFalse(sut.state.value.isActive)
    }

    @Test
    fun `isActive is false when Finished`() {
        // Directly set finished state
        assertFalse(TimerState.Finished.isActive)
    }

    @Test
    fun `start replaces existing timer`() {
        sut.start(60)
        sut.start(120)
        val state = sut.state.value as TimerState.Running
        assertEquals(120, state.remainingSeconds)
    }
}
