import { expect, test } from "@playwright/test";

test("release UI surfaces Delta 0 backoffice gates", async ({ page }) => {
  await page.goto("/backoffice/ceo");

  await expect(page.getByRole("heading", { name: "CEO Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved Filters" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Role Notifications" })).toBeVisible();

  await page.goto("/backoffice/deals");

  await expect(page.getByRole("heading", { name: "CRM Productivity" })).toBeVisible();
  await expect(page.getByText(/Next contact: 2026-06-22T09:/).first()).toBeVisible();
  await expect(page.getByText("waiting_supplier_eta").first()).toBeVisible();

  await page.goto("/backoffice/integrations");

  await expect(page.getByRole("heading", { name: "Integration Inbound Inbox" })).toBeVisible();
  await expect(page.getByText("ATS", { exact: true })).toBeVisible();
  await expect(page.getByLabel("status received")).toBeVisible();

  await page.goto("/backoffice/notifications");

  await expect(page.getByRole("heading", { name: "Notification Dispatch Log" })).toBeVisible();
  await expect(page.getByText("Telegram", { exact: true })).toBeVisible();
  await expect(page.getByLabel("status queued")).toBeVisible();
});
