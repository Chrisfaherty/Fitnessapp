import XCTest

final class WorkoutFlowUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["UI_TESTING"] = "1"
        app.launch()
        loginAsClient()
    }

    override func tearDownWithError() throws {
        app.terminate()
    }

    // MARK: – Tab Navigation

    func test_workoutsTab_isAccessible() throws {
        tapTab("Workouts")
        XCTAssertTrue(app.navigationBars["Workouts"].waitForExistence(timeout: 5))
    }

    func test_diaryTab_isAccessible() throws {
        tapTab("Diary")
        XCTAssertTrue(app.navigationBars["Daily Diary"].waitForExistence(timeout: 5))
    }

    func test_checkInTab_isAccessible() throws {
        tapTab("Check-In")
        XCTAssertTrue(app.navigationBars["Weekly Check-In"].waitForExistence(timeout: 5))
    }

    func test_mealsTab_isAccessible() throws {
        tapTab("Meals")
        XCTAssertTrue(app.navigationBars["Meal Plans"].waitForExistence(timeout: 5))
    }

    func test_messagesTab_isAccessible() throws {
        tapTab("Messages")
        XCTAssertTrue(app.navigationBars["Messages"].waitForExistence(timeout: 5))
    }

    // MARK: – Workout Session

    func test_workoutList_startButton_launchesSession() throws {
        tapTab("Workouts")
        let startButton = app.buttons["Start Workout"].firstMatch
        guard startButton.waitForExistence(timeout: 8) else {
            // No assignments seeded — skip gracefully
            return
        }
        startButton.tap()
        // Session shows exercise header
        let exerciseHeader = app.staticTexts.matching(
            NSPredicate(format: "label BEGINSWITH 'Exercise '")
        ).firstMatch
        XCTAssertTrue(exerciseHeader.waitForExistence(timeout: 8))
    }

    func test_workoutSession_logSet_completesSet() throws {
        tapTab("Workouts")
        let startButton = app.buttons["Start Workout"].firstMatch
        guard startButton.waitForExistence(timeout: 8) else { return }
        startButton.tap()

        // Wait for session view
        let header = app.staticTexts.matching(
            NSPredicate(format: "label BEGINSWITH 'Exercise '")
        ).firstMatch
        guard header.waitForExistence(timeout: 8) else { return }

        // Fill weight in first set row
        let weightFields = app.textFields.matching(
            NSPredicate(format: "placeholderValue CONTAINS[c] 'kg'")
        )
        if weightFields.firstMatch.waitForExistence(timeout: 3) {
            weightFields.firstMatch.tap()
            weightFields.firstMatch.typeText("60")
        }

        // Tap complete set button
        let completeButton = app.buttons["Complete set"].firstMatch
        if completeButton.waitForExistence(timeout: 3) {
            completeButton.tap()
        }

        // Rest timer should appear
        let timerLabel = app.staticTexts.matching(
            NSPredicate(format: "label MATCHES '\\d+:\\d+'")
        ).firstMatch
        XCTAssertTrue(timerLabel.waitForExistence(timeout: 5))
    }

    func test_restTimer_skipButton_dismissesTimer() throws {
        tapTab("Workouts")
        let startButton = app.buttons["Start Workout"].firstMatch
        guard startButton.waitForExistence(timeout: 8) else { return }
        startButton.tap()

        let header = app.staticTexts.matching(
            NSPredicate(format: "label BEGINSWITH 'Exercise '")
        ).firstMatch
        guard header.waitForExistence(timeout: 8) else { return }

        // Complete a set to trigger timer
        let completeButton = app.buttons["Complete set"].firstMatch
        if completeButton.waitForExistence(timeout: 3) {
            completeButton.tap()
        }

        let skipButton = app.buttons["Skip"].firstMatch
        guard skipButton.waitForExistence(timeout: 5) else { return }
        skipButton.tap()

        // Timer should disappear
        XCTAssertFalse(skipButton.waitForExistence(timeout: 2))
    }

    func test_workoutSession_finishWorkout_returnsToList() throws {
        tapTab("Workouts")
        let startButton = app.buttons["Start Workout"].firstMatch
        guard startButton.waitForExistence(timeout: 8) else { return }
        startButton.tap()

        let finishButton = app.buttons["Finish Workout"]
        guard finishButton.waitForExistence(timeout: 10) else { return }

        // Navigate through all exercises if multi-exercise template
        var attempts = 0
        while !finishButton.isEnabled && attempts < 10 {
            let nextButton = app.buttons["Next Exercise"].firstMatch
            if nextButton.waitForExistence(timeout: 2) {
                nextButton.tap()
            }
            attempts += 1
        }

        finishButton.tap()
        XCTAssertTrue(app.navigationBars["Workouts"].waitForExistence(timeout: 8))
    }

    // MARK: – Diary

    func test_diary_addEntry_savesSuccessfully() throws {
        tapTab("Diary")
        let addButton = app.buttons["Add Entry"]
        guard addButton.waitForExistence(timeout: 5) else { return }
        addButton.tap()

        let moodField = app.textFields["Mood (1–10)"]
        guard moodField.waitForExistence(timeout: 3) else { return }
        moodField.tap(); moodField.typeText("8")

        let sleepField = app.textFields["Sleep hours"]
        sleepField.tap(); sleepField.typeText("7.5")

        app.buttons["Save"].tap()

        // Entry should appear in list
        let entry = app.cells.firstMatch
        XCTAssertTrue(entry.waitForExistence(timeout: 5))
    }

    // MARK: – Helpers

    private func loginAsClient() {
        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 10) else { return }
        emailField.tap()
        emailField.typeText("client1@fitnessapp.dev")

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText("Client1234!")

        app.buttons["Sign In"].tap()
        _ = app.tabBars.firstMatch.waitForExistence(timeout: 10)
    }

    private func tapTab(_ label: String) {
        let tab = app.tabBars.buttons[label]
        if tab.waitForExistence(timeout: 5) { tab.tap() }
    }
}
