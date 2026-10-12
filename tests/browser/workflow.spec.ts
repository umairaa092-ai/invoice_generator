import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyWorkspace, demoWorkspace } from "../../src/lib/seed";

const nav = (page: Page, label: string) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: label, exact: true })
    .click();
const manage = (page: Page, label: string) =>
  page
    .getByRole("navigation", { name: "Workspace management" })
    .getByRole("button", { name: label, exact: true })
    .click();
const records = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("billora.workspace.v1")!),
  );
async function fresh(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start fresh", exact: true })
    .click();
  await expect(page.getByText("You’re exploring sample data.")).toHaveCount(0);
}
async function newInvoice(page: Page, newClient: boolean, deposit?: string) {
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  const dialog = page.getByRole("dialog");
  if (newClient) {
    await dialog
      .getByRole("button", { name: "Add new client", exact: true })
      .click();
    await dialog
      .getByLabel("Client / company name", { exact: true })
      .fill("Polaris Design");
    await dialog
      .getByLabel("Email", { exact: true })
      .fill("billing@polaris.example");
  } else
    await dialog
      .getByLabel("Client", { exact: true })
      .selectOption({ label: "Polaris Design" });
  await dialog
    .getByLabel("Item 1 description", { exact: true })
    .fill("Creative direction");
  await dialog.getByLabel("Item 1 unit price", { exact: true }).fill("1000");
  await dialog
    .getByRole("button", { name: "Add line item", exact: true })
    .click();
  await dialog
    .getByLabel("Item 2 description", { exact: true })
    .fill("Production delivery");
  await dialog.getByLabel("Item 2 unit price", { exact: true }).fill("500");
  if (deposit) {
    await dialog
      .getByRole("checkbox", { name: "Record a payment or deposit now" })
      .check();
    await dialog
      .getByLabel("Deposit amount (USD)", { exact: true })
      .fill(deposit);
  }
  await dialog
    .getByRole("button", { name: "Save invoice", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}
async function pay(page: Page, amount: string, reference: string) {
  await page
    .getByRole("button", { name: "Record payment for INV-0001", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount (USD)", { exact: true }).fill(amount);
  await dialog
    .getByLabel("Reference (optional)", { exact: true })
    .fill(reference);
  await dialog
    .getByRole("button", { name: "Save payment", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}

test("complete invoice, payments, merge, appearance, mobile and cascade lifecycle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fresh(page);
  await newInvoice(page, true, "300");
  let state = await records(page);
  expect(state.clients).toHaveLength(1);
  expect(state.invoices).toHaveLength(1);
  expect(state.payments).toHaveLength(1);
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total invoiced" })
      .locator(".metric-value"),
  ).toContainText("$1,500.00");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total collected" })
      .locator(".metric-value"),
  ).toContainText("$300.00");
  await nav(page, "Invoices");
  let row = page.locator("tbody tr").filter({ hasText: "INV-0001" });
  await expect(row).toContainText("$1,200.00");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await pay(page, "700", "Second installment");
  await expect(row).toContainText("$500.00");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await pay(page, "500", "Final installment");
  await expect(row.locator(".badge")).toHaveText("Paid");
  await nav(page, "Payments");
  const final = page
    .locator("tbody tr")
    .filter({ hasText: "Final installment" });
  await final.getByRole("button", { name: /Delete payment/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete payment", exact: true })
    .click();
  await nav(page, "Invoices");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await expect(row).toContainText("$500.00");
  await manage(page, "Backup & restore");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const download = await downloading,
    path = await download.path();
  expect(path).toBeTruthy();
  const backup = await readFile(path!);
  await newInvoice(page, false, "50");
  await nav(page, "Invoices");
  await page
    .getByRole("button", { name: "Edit INV-0001", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Notes & payment instructions", { exact: true })
    .fill("Newer local note");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await manage(page, "Backup & restore");
  await page.getByLabel("Select a Billora JSON backup").setInputFiles({
    name: "test-backup.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await expect(page.getByText("Backup ready to review")).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Merge backup", exact: true })
    .click();
  state = await records(page);
  expect(state.invoices).toHaveLength(2);
  expect(
    state.invoices.find((i: any) => i.invoiceNumber === "INV-0001").notes,
  ).toBe("Newer local note");
  expect(state.payments).toHaveLength(3);
  await page
    .getByRole("button", { name: "Undo last restore", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Undo restore", exact: true })
    .click();
  state = await records(page);
  expect(state.invoices).toHaveLength(2);
  expect(state.invoices[0].notes).toBe("Newer local note");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await nav(page, "Invoices");
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".editor-preview"),
  ).toBeVisible();
  const amountHeader = page
    .getByRole("dialog")
    .locator(".preview-items")
    .getByRole("columnheader", { name: "Amount", exact: true });
  await amountHeader.scrollIntoViewIfNeeded();
  const box = await amountHeader.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Delete INV-0001", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("2 linked payments");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  state = await records(page);
  expect(state.invoices).toHaveLength(1);
  expect(state.payments).toHaveLength(1);
  expect(state.clients).toHaveLength(1);
  await nav(page, "Clients");
  await page
    .getByRole("button", { name: "Delete Polaris Design", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "1 invoice and 1 payment",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete client", exact: true })
    .click();
  state = await records(page);
  expect(state.clients).toHaveLength(0);
  expect(state.invoices).toHaveLength(0);
  expect(state.payments).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("validation, currency isolation, safe drafts, printing and malformed backup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Dashboard currency").selectOption("EUR");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total invoiced" })
      .locator(".metric-value"),
  ).toContainText("€3,200.00");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total collected" })
      .locator(".metric-value"),
  ).toContainText("€800.00");
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Invoice number", { exact: true })
    .fill("INV-0023");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toContainText("Discard this draft?");
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Invoice number", { exact: true }),
  ).toHaveValue("INV-0023");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await nav(page, "Invoices");
  await page
    .getByRole("button", { name: "Record payment for INV-0018", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Amount (USD)", { exact: true })
    .fill("4001");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save payment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await records(page)).payments).toHaveLength(9);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Print INV-0018", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-root")).toBeVisible();
  await expect(
    page
      .locator("#print-root")
      .getByRole("columnheader", { name: "Amount", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await manage(page, "Backup & restore");
  const before = await records(page);
  await page.getByLabel("Select a Billora JSON backup").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad json"),
  });
  await expect(page.locator(".toast-error")).toContainText(
    /valid JSON|could not|malformed/i,
  );
  expect(await records(page)).toEqual(before);
  await page.getByLabel("Select a Billora JSON backup").setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(emptyWorkspace())),
  });
  await page.getByRole("radio").nth(1).check();
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "replace your current 8 clients, 12 invoices, and 9 payments",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  expect((await records(page)).invoices).toHaveLength(0);
  await page
    .getByRole("button", { name: "Undo last restore", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Undo restore", exact: true })
    .click();
  expect(await records(page)).toEqual(before);
});

test("unreadable and disabled storage preserve a usable recovery screen", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("billora.workspace.v1", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("billora.workspace.v1")),
  ).toBe("{broken");
  await manage(page, "Backup & restore");
  await page.getByLabel("Select a Billora JSON backup").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(demoWorkspace())),
  });
  await page.getByRole("radio").nth(1).check();
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await records(page)).invoices).toHaveLength(12);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("billora.corrupt-recovery.v1"),
    ),
  ).toBe("{broken");
  const errors: string[] = [];
  const denied = await page.context().newPage();
  denied.on("pageerror", (e) => errors.push(e.message));
  await denied.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    });
  });
  await denied.goto("/");
  await expect(denied.getByRole("alert")).toBeVisible();
  await expect(
    denied.getByRole("heading", { name: "Let’s keep things flowing." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await denied.close();
});
