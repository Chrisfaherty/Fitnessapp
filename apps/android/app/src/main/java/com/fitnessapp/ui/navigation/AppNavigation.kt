package com.fitnessapp.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.fitnessapp.ui.auth.AuthViewModel
import com.fitnessapp.ui.auth.LoginScreen
import com.fitnessapp.ui.checkin.CheckInScreen
import com.fitnessapp.ui.dashboard.DashboardScreen
import com.fitnessapp.ui.diary.DiaryScreen
import com.fitnessapp.ui.meals.MealPlanScreen
import com.fitnessapp.ui.messaging.MessagingScreen
import com.fitnessapp.ui.workout.WorkoutListScreen
import com.fitnessapp.ui.workout.WorkoutSessionScreen

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Home",      Icons.Default.Home)
    object Workouts  : Screen("workouts",  "Workouts",  Icons.Default.FitnessCenter)
    object Diary     : Screen("diary",     "Diary",     Icons.Default.Notes)
    object CheckIn   : Screen("checkin",   "Check-In",  Icons.Default.CheckCircle)
    object Meals     : Screen("meals",     "Meals",     Icons.Default.Restaurant)
    object Messaging : Screen("messaging", "Messages",  Icons.Default.ChatBubble)
    object Login     : Screen("login",     "Login",     Icons.Default.Login)
}

val bottomNavItems = listOf(
    Screen.Dashboard,
    Screen.Workouts,
    Screen.Diary,
    Screen.CheckIn,
    Screen.Meals,
    Screen.Messaging,
)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val authVM: AuthViewModel = hiltViewModel()
    val isAuthenticated by authVM.isAuthenticated.collectAsState()

    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    val showBottomBar = isAuthenticated && !currentRoute.orEmpty().startsWith("workout_session")

    LaunchedEffect(isAuthenticated) {
        if (isAuthenticated) {
            navController.navigate(Screen.Dashboard.route) {
                popUpTo(Screen.Login.route) { inclusive = true }
            }
        } else {
            navController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    val currentDest = currentEntry?.destination
                    bottomNavItems.forEach { screen ->
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.label) },
                            label = { Text(screen.label) },
                            selected = currentDest?.hierarchy?.any { it.route == screen.route } == true,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Login.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Login.route)     { LoginScreen(navController) }
            composable(Screen.Dashboard.route) { DashboardScreen() }
            composable(Screen.Workouts.route)  { WorkoutListScreen(navController) }
            composable(Screen.Diary.route)     { DiaryScreen() }
            composable(Screen.CheckIn.route)   { CheckInScreen() }
            composable(Screen.Meals.route)     { MealPlanScreen() }
            composable(Screen.Messaging.route) { MessagingScreen() }
            composable("workout_session/{assignmentId}") { backStack ->
                val assignmentId = backStack.arguments?.getString("assignmentId") ?: return@composable
                WorkoutSessionScreen(
                    assignmentId = assignmentId,
                    navController = navController
                )
            }
        }
    }
}
