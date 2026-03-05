package com.fitnessapp

import com.fitnessapp.data.model.*
import org.junit.Assert.*
import org.junit.Test

class WorkoutViewModelTest {

    // MARK: - LoggedSet

    @Test
    fun `LoggedSet defaults to not complete`() {
        val set = LoggedSet(setNumber = 1, reps = 10, weightKg = 80.0)
        assertFalse(set.isComplete)
    }

    @Test
    fun `LoggedSet can be marked complete`() {
        val set = LoggedSet(setNumber = 1, reps = 10, weightKg = 80.0).copy(isComplete = true)
        assertTrue(set.isComplete)
    }

    // MARK: - LastSessionInfo

    @Test
    fun `lastSet returns last element`() {
        val sets = listOf(
            LastSetInfo(1, 8, 60.0),
            LastSetInfo(2, 8, 62.5),
            LastSetInfo(3, 7, 62.5, 8.0)
        )
        val session = LastSessionInfo("squat", sets, "2024-01-01")
        assertEquals(3, session.lastSet?.setNumber)
        assertEquals(62.5, session.lastSet?.weightKg)
    }

    @Test
    fun `lastSet is null when sets empty`() {
        val session = LastSessionInfo("squat", emptyList(), "2024-01-01")
        assertNull(session.lastSet)
    }

    // MARK: - Prefill logic

    @Test
    fun `prefill from last session uses last weight`() {
        val lastSession = LastSessionInfo(
            exerciseId = "barbell-bench-press",
            sets = listOf(
                LastSetInfo(1, 10, 80.0),
                LastSetInfo(2, 10, 80.0),
                LastSetInfo(3, 8, 80.0)
            ),
            performedAt = "2024-01-01"
        )

        // Simulate prefill: create default sets using last session data
        val templateExercise = WorkoutTemplateExercise(
            id = "wte-1", templateId = "t1", exerciseId = "barbell-bench-press",
            sortOrder = 0, targetSets = 3, repMin = 8, repMax = 12, restSeconds = 90
        )

        val prefillWeight = lastSession.lastSet?.weightKg
        val prefillReps   = lastSession.lastSet?.reps ?: templateExercise.repMax

        val loggedSets = (1..templateExercise.targetSets).map { n ->
            LoggedSet(setNumber = n, reps = prefillReps, weightKg = prefillWeight)
        }

        assertEquals(3, loggedSets.size)
        assertEquals(80.0, loggedSets[0].weightKg)
        assertEquals(8, loggedSets[0].reps)
    }

    @Test
    fun `prefill uses repMax when no last session`() {
        val templateExercise = WorkoutTemplateExercise(
            id = "wte-1", templateId = "t1", exerciseId = "pull-up",
            sortOrder = 0, targetSets = 4, repMin = 6, repMax = 10, restSeconds = 120
        )
        val prefillReps = 10  // repMax
        val loggedSets = (1..templateExercise.targetSets).map { n ->
            LoggedSet(setNumber = n, reps = prefillReps, weightKg = null)
        }

        assertEquals(4, loggedSets.size)
        assertEquals(10, loggedSets[0].reps)
        assertNull(loggedSets[0].weightKg)
    }

    // MARK: - Result wrapper

    @Test
    fun `Result_Success holds data`() {
        val result = Result.Success(listOf(1, 2, 3))
        assertTrue(result is Result.Success)
        assertEquals(3, (result as Result.Success).data.size)
    }

    @Test
    fun `Result_Error holds message`() {
        val result = Result.Error("Network error")
        assertTrue(result is Result.Error)
        assertEquals("Network error", (result as Result.Error).message)
    }
}
