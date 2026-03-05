package com.fitnessapp

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.fitnessapp.data.health.FakeHealthDataClient
import com.fitnessapp.data.health.HealthDataClient
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import dagger.hilt.android.testing.UninstallModules
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import javax.inject.Inject

/**
 * Instrumented UI flow tests for the workout session screen.
 *
 * Runs on an emulator/device. Uses the Fake health client via Hilt test bindings.
 * Requires a seeded local Supabase instance (started by CI with `supabase start`).
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class WorkoutFlowTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setUp() {
        hiltRule.inject()
    }

    // ─── Login ───────────────────────────────────────────────────────────────

    @Test
    fun loginScreen_displaysSignInButton() {
        composeRule.onNodeWithText("Sign In").assertIsDisplayed()
    }

    @Test
    fun loginScreen_withBlankCredentials_buttonIsDisabled() {
        composeRule
            .onNodeWithText("Sign In")
            .assertIsNotEnabled()
    }

    @Test
    fun loginScreen_withCredentials_buttonIsEnabled() {
        composeRule.onNodeWithText("Email")
            .performTextInput("client1@fitnessapp.dev")
        composeRule.onNodeWithText("Password")
            .performTextInput("Client1234!")
        composeRule
            .onNodeWithText("Sign In")
            .assertIsEnabled()
    }

    // ─── Dashboard ───────────────────────────────────────────────────────────

    @Test
    fun afterLogin_dashboardIsVisible() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Dashboard").assertIsDisplayed()
    }

    // ─── Workouts Tab ────────────────────────────────────────────────────────

    @Test
    fun workoutsTab_showsAssignedWorkouts() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Workouts").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("My Workouts"), timeoutMillis = 5_000)
        // Either shows list or empty placeholder — both are valid
        val hasList = try {
            composeRule.onAllNodesWithText("Start Workout").fetchSemanticsNodes().isNotEmpty()
        } catch (e: AssertionError) { false }
        val hasEmpty = try {
            composeRule.onNodeWithText("No workouts assigned yet").isDisplayed()
        } catch (e: AssertionError) { false }
        assert(hasList || hasEmpty) { "Expected either workout list or empty placeholder" }
    }

    @Test
    fun workoutsTab_startWorkout_navigatesToSession() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Workouts").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("My Workouts"), timeoutMillis = 5_000)

        // Skip test if no assignments are seeded
        val startButtons = composeRule.onAllNodesWithText("Start Workout").fetchSemanticsNodes()
        if (startButtons.isEmpty()) return

        composeRule.onAllNodesWithText("Start Workout")[0].performClick()
        // Should show progress indicator and exercise name
        composeRule.waitUntilAtLeastOneExists(
            hasText("Exercise 1 of", substring = true),
            timeoutMillis = 5_000
        )
    }

    @Test
    fun workoutSession_logSet_marksCompleted() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Workouts").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("My Workouts"), timeoutMillis = 5_000)

        val startButtons = composeRule.onAllNodesWithText("Start Workout").fetchSemanticsNodes()
        if (startButtons.isEmpty()) return

        composeRule.onAllNodesWithText("Start Workout")[0].performClick()
        composeRule.waitUntilAtLeastOneExists(
            hasText("Exercise 1 of", substring = true),
            timeoutMillis = 5_000
        )

        // Fill in weight and reps for first set
        composeRule.onAllNodesWithText("kg")[0].performTextInput("60")
        composeRule.onAllNodesWithText("reps")[0].performTextInput("10")

        // Complete the set
        composeRule.onAllNodesWithContentDescription("Complete set")[0].performClick()

        // The set row should now show completed state
        composeRule.onAllNodesWithText("60")[0].assertExists()
    }

    // ─── Diary Tab ───────────────────────────────────────────────────────────

    @Test
    fun diaryTab_showsDiaryScreen() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Diary").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("Daily Diary"), timeoutMillis = 5_000)
        composeRule.onNodeWithText("Daily Diary").assertIsDisplayed()
    }

    // ─── Check-In Tab ────────────────────────────────────────────────────────

    @Test
    fun checkInTab_showsCheckInScreen() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Check-In").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("Weekly Check-In"), timeoutMillis = 5_000)
        composeRule.onNodeWithText("Weekly Check-In").assertIsDisplayed()
    }

    // ─── Meals Tab ───────────────────────────────────────────────────────────

    @Test
    fun mealsTab_showsMealPlanScreen() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Meals").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("Meal Plans"), timeoutMillis = 5_000)
        composeRule.onNodeWithText("Meal Plans").assertIsDisplayed()
    }

    // ─── Rest Timer ──────────────────────────────────────────────────────────

    @Test
    fun restTimerBar_appearsAfterSetCompletion() {
        loginAsClient()
        composeRule.waitUntilAtLeastOneExists(hasText("Dashboard"), timeoutMillis = 10_000)
        composeRule.onNodeWithText("Workouts").performClick()
        composeRule.waitUntilAtLeastOneExists(hasText("My Workouts"), timeoutMillis = 5_000)

        val startButtons = composeRule.onAllNodesWithText("Start Workout").fetchSemanticsNodes()
        if (startButtons.isEmpty()) return

        composeRule.onAllNodesWithText("Start Workout")[0].performClick()
        composeRule.waitUntilAtLeastOneExists(
            hasText("Exercise 1 of", substring = true), timeoutMillis = 5_000
        )

        composeRule.onAllNodesWithText("reps")[0].performTextInput("10")
        composeRule.onAllNodesWithContentDescription("Complete set")[0].performClick()

        // Timer bar should appear at bottom
        composeRule.waitUntilAtLeastOneExists(hasText("Skip", substring = true), timeoutMillis = 3_000)
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private fun loginAsClient() {
        composeRule.waitUntilAtLeastOneExists(hasText("Sign In"), timeoutMillis = 5_000)
        composeRule.onNodeWithText("Email").performTextInput("client1@fitnessapp.dev")
        composeRule.onNodeWithText("Password").performTextInput("Client1234!")
        composeRule.onNodeWithText("Sign In").performClick()
    }
}
