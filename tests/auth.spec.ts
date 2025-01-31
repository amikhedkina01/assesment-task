import { test, expect } from "@playwright/test";

// Helper function for user login
async function login(page, username: string, password: string, rememberUser = false) {
  await page.goto("/signin");
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  if (rememberUser) {
    await page.check('input[name="remember"]');
  }
  await page.click('button[type="submit"]');
}

test.describe("User Sign-up and Login", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.storageState({ path: "auth.json" });
    await page.route("**/users", (route) => route.continue());
    await page.route("**/graphql", (route) => route.continue());
  });

  test("should redirect unauthenticated user to signin page", async ({ page }) => {
    await page.goto("/personal");
    await expect(page).toHaveURL("/signin");
  });

  test("should redirect to the home page after login", async ({ page }) => {
    const user = { username: "Heath93", password: "s3cret" };
    await login(page, user.username, user.password, true);
    await expect(page).toHaveURL("/");
  });

  test("should remember a user for 30 days after login", async ({ page, context }) => {
    const user = { username: "Heath93", password: "s3cret" };
    await login(page, user.username, user.password, true);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const cookies = await page.context().cookies(page.url());
    const sessionCookie = cookies.find((c) => c.name === "connect.sid");
    console.log(sessionCookie); // i didn't get why but without this next step didn't work :/
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toHaveProperty("expires");
    await page.click('[data-test="sidenav-signout"]');
    await expect(page).toHaveURL("/signin");
  });

  test("should allow a visitor to sign-up, login, and logout", async ({ page }) => {
    const userInfo = {
      firstName: "Bob",
      lastName: "Ross",
      username: "PainterJoy90",
      password: "s3cret",
    };
    await page.goto("/");
    await page.click('[data-test="signup"]');
    await page.locator('[data-test="signup"]').click();
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("textbox", { name: "First Name" }).fill(userInfo.firstName);
    await page.getByRole("textbox", { name: "Last Name" }).fill(userInfo.lastName);
    await page.getByRole("textbox", { name: "Username" }).fill(userInfo.username);
    await page
      .locator('[data-test="signup-password"]')
      .getByRole("textbox", { name: "Password" })
      .fill(userInfo.password);
    await page.getByRole("textbox", { name: "Confirm Password" }).fill(userInfo.password);
    await page.click('[data-test="signup-submit"]');
    await login(page, userInfo.username, userInfo.password);
    await expect(page.locator('[data-test="user-onboarding-dialog"]')).toBeVisible();
    await page.click('[data-test="user-onboarding-next"]');
    await page.getByRole("textbox", { name: "Bank Name" }).fill("test1");
    await page.getByRole("textbox", { name: "Routing Number" }).fill("12345771r");
    await page.getByRole("textbox", { name: "Account Number" }).fill("5432107777");
    await page.locator('[data-test="bankaccount-submit"]').click();
    await page.locator('[data-test="user-onboarding-next"]').click();
    await page.click('[data-test="sidenav-signout"]');
    await expect(page).toHaveURL("/signin");
  });

  test("should display login errors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Username" }).blur();
    await expect(page.locator("#username-helper-text")).toBeVisible();
    await page.getByRole("textbox", { name: "Password" }).fill("abc");
    await page.getByRole("textbox", { name: "Password" }).blur();
    await expect(page.locator("#password-helper-text")).toBeVisible();
    await expect(page.locator('[data-test="signin-submit"]')).toBeDisabled();
  });

  test("should display signup errors", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("textbox", { name: "First Name" }).blur();
    await expect(page.locator("#firstName-helper-text")).toBeVisible();
    await page.getByRole("textbox", { name: "Last Name" }).click();
    await page.getByRole("textbox", { name: "Last Name" }).blur();
    await expect(page.locator("#lastName-helper-text")).toBeVisible();
    await page.getByRole("textbox", { name: "Username" }).click();
    await page.getByRole("textbox", { name: "Username" }).blur();
    await expect(page.locator("#username-helper-text")).toBeVisible();
    await page
      .locator('[data-test="signup-password"]')
      .getByRole("textbox", { name: "Password" })
      .fill("abc");
    await expect(page.locator("#password-helper-text")).toBeVisible();
    await page.getByRole("textbox", { name: "Confirm Password" }).fill("DIFFERENT PASSWOR");
    await expect(page.locator("#confirmPassword-helper-text")).toBeVisible();
    await expect(page.locator('[data-test="signup-submit"]')).toBeDisabled();
  });

  test("should error for an invalid user", async ({ page }) => {
    await login(page, "invalidUserName", "invalidPa$$word");
    await expect(page.locator('[data-test="signin-error"]')).toHaveText(
      "Username or password is invalid"
    );
  });

  test("should error for an invalid password for existing user", async ({ page }) => {
    const user = { username: "testuser", password: "INVALID" };
    await login(page, user.username, user.password);
    await expect(page.locator('[data-test="signin-error"]')).toHaveText(
      "Username or password is invalid"
    );
  });
});
