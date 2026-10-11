import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("CSE semester");
});
test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
test("login form validates input", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter your password")).toBeVisible();
});

// Requires a migrated + seeded database (npm run db:setup)
test.describe("seeded demo flow", () => {
  test("student signs in and sees the dashboard; admin area is blocked", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("student@smarthub.demo");
    await page.getByLabel("Password").fill("Demo@12345");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Assignment progress")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
  test("assistant answers from sources or says it has none", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("student@smarthub.demo");
    await page.getByLabel("Password").fill("Demo@12345");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.goto("/assistant");
    await page.getByLabel("Your message").fill("What are the four conditions for deadlock?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Sources")).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Your message").fill("Explain quantum chromodynamics gluon confinement");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("won't guess")).toBeVisible({ timeout: 20_000 });
  });
});
