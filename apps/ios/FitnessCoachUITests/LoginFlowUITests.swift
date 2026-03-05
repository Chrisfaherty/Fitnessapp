import XCTest

final class LoginFlowUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchEnvironment["UI_TESTING"] = "1"
        app.launch()
    }

    override func tearDownWithError() throws {
        app.terminate()
    }

    // MARK: – Login Screen Presence

    func test_loginScreen_showsSignInButton() throws {
        XCTAssertTrue(app.buttons["Sign In"].waitForExistence(timeout: 5))
    }

    func test_loginScreen_signInButton_disabledWhenEmpty() throws {
        let button = app.buttons["Sign In"]
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        XCTAssertFalse(button.isEnabled)
    }

    func test_loginScreen_signInButton_enabledWithCredentials() throws {
        fillCredentials(email: "client1@fitnessapp.dev", password: "Client1234!")
        let button = app.buttons["Sign In"]
        XCTAssertTrue(button.isEnabled)
    }

    // MARK: – Error Handling

    func test_loginScreen_wrongPassword_showsError() throws {
        fillCredentials(email: "client1@fitnessapp.dev", password: "WrongPass!")
        app.buttons["Sign In"].tap()
        let errorLabel = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'Invalid' OR label CONTAINS[c] 'error'")
        ).firstMatch
        XCTAssertTrue(errorLabel.waitForExistence(timeout: 8))
    }

    // MARK: – Successful Login

    func test_loginFlow_successNavigatesToDashboard() throws {
        fillCredentials(email: "client1@fitnessapp.dev", password: "Client1234!")
        app.buttons["Sign In"].tap()
        let dashboard = app.navigationBars["Dashboard"]
        XCTAssertTrue(dashboard.waitForExistence(timeout: 10))
    }

    func test_loginFlow_trainerCanLogin() throws {
        fillCredentials(email: "trainer1@fitnessapp.dev", password: "Trainer1234!")
        app.buttons["Sign In"].tap()
        // Trainer lands on same dashboard shell
        let nav = app.navigationBars.firstMatch
        XCTAssertTrue(nav.waitForExistence(timeout: 10))
    }

    // MARK: – Helpers

    private func fillCredentials(email: String, password: String) {
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText(email)

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 3))
        passwordField.tap()
        passwordField.typeText(password)
    }
}
