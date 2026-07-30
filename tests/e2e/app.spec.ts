import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
}

test("home page labels demo mode and is accessible", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText(
      "Demonstration mode uses simulated data. No live threat-intelligence services were checked.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pause before you trust a link." }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Website address" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Open demonstration" }),
  ).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("demonstration renders a strong-warning example with the required caveat", async ({
  page,
}) => {
  await page.goto("/demo");
  const card = page
    .getByRole("article")
    .filter({ hasText: "Strong warning indicators example" });
  await card.getByRole("button", { name: "View this example" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Strong warning indicators",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("meter", { name: /Observed risk score/ }),
  ).toHaveAttribute("aria-valuenow", "80");
  await expect(
    page.getByText(
      /This score reflects limited automated signals available at the time/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /high score does not prove fraud, illegality, or malicious intent/i,
    ),
  ).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("methodology publishes score boundaries and rules", async ({ page }) => {
  await page.goto("/methodology");
  await expect(
    page.getByRole("heading", { name: "How the score works." }),
  ).toBeVisible();
  await expect(page.getByText("0–24")).toBeVisible();
  await expect(page.getByText("75–100")).toBeVisible();
  await page
    .getByText("Recent confirmed high-confidence database match")
    .click();
  await expect(
    page.getByText("TI_CONFIRMED_RECENT_HIGH · 1.0.0"),
  ).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("private correction flow generates an email reference without public posting", async ({
  page,
}) => {
  await page.goto("/corrections?result=demo-warning");
  await page
    .getByLabel("What should be reviewed?")
    .fill(
      "The reserved demonstration result should be reviewed as a correction-flow accessibility test.",
    );
  await page
    .getByLabel("Supporting information (optional)")
    .fill("No real website is involved.");
  await page.getByLabel("Reply email").fill("owner@example.com");
  await page
    .getByRole("button", { name: "Generate private reference" })
    .click();
  await expect(page.getByText(/Reference: WRC-/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review private email draft" }),
  ).toHaveAttribute("href", /^mailto:corrections@example\.com/);
  await expectNoSeriousA11yViolations(page);
});
