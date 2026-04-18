import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");

    // Check main heading
    await expect(
      page.getByRole("heading", { name: /Transform Your Neighborhood/i }),
    ).toBeVisible();

    // Check CTA buttons
    await expect(
      page.getByRole("link", { name: /Get Started/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Start Reporting/i }),
    ).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Login/i }).click();
    await expect(page).toHaveURL("/auth/login");
  });

  test("should navigate to signup page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Get Started/i })
      .first()
      .click();
    await expect(page).toHaveURL("/auth/signup");
  });

  test("should display features section", async ({ page }) => {
    await page.goto("/");

    // Scroll to features
    await page.getByText("Location-Based Reporting").scrollIntoViewIfNeeded();

    // Check feature cards
    await expect(page.getByText("Location-Based Reporting")).toBeVisible();
    await expect(page.getByText("AI Classification")).toBeVisible();
    await expect(page.getByText("Gamification & Rewards")).toBeVisible();
  });

  test("should be mobile responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check hero is visible
    await expect(
      page.getByRole("heading", { name: /Transform Your Neighborhood/i }),
    ).toBeVisible();

    // Check CTA is visible
    await expect(
      page.getByRole("link", { name: /Start Reporting/i }),
    ).toBeVisible();
  });
});
