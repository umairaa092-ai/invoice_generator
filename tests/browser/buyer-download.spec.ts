import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { emptyWorkspace } from "../../src/lib/seed";
import type { Workspace } from "../../src/lib/types";

test.setTimeout(60_000);

const buyerPath = path.resolve(
  process.env.CELLSPRAY_BUYER_APP ||
    "release/Cellspray-Invoice-Payment-Tracker/Cellspray-Invoice-Payment-Tracker.html",
);
const buyerURL = pathToFileURL(buyerPath).href;
const workspaceKey = "billora.workspace.v1";
const rollbackKey = "billora.rollback.v1";

async function navigate(page: Page, label: string) {
  await page
    .locator("nav")
    .getByRole("button", { name: label, exact: true })
    .click();
}

async function records(page: Page): Promise<Workspace> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    workspaceKey,
  );
}

async function offline(page: Page) {
  const errors: string[] = [],
    requests: string[] = [],
    failures: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  page.on("requestfailed", (request) => failures.push(request.url()));
  await page.context().setOffline(true);
  return {
    verify() {
      expect(errors).toEqual([]);
      expect(failures).toEqual([]);
      expect(requests.some((url) => /^https?:/i.test(url))).toBe(false);
      expect(requests.every((url) => /^(file|data|blob):/i.test(url))).toBe(
        true,
      );
    },
  };
}

async function saveSettings(page: Page) {
  const save = page.getByRole("button", { name: "Save settings", exact: true });
  await save.click();
  await expect(save).toBeDisabled();
}

async function uploadLogo(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#147d83";
    context.fillRect(100, 100, 600, 200);
    context.fillStyle = "#ffffff";
    context.font = "bold 72px sans-serif";
    context.fillText("ASTER", 260, 235);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Upload business logo", { exact: true }).setInputFiles({
    name: "aster-logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });
  await expect(
    page.getByRole("group", { name: "Business logo upload" }),
  ).toHaveAttribute("aria-busy", "false");
  await expect(
    page
      .locator(".branding-preview-card")
      .getByRole("img", { name: "Aster Studio logo", exact: true }),
  ).toBeVisible();
}

async function restore(page: Page, bytes: Buffer) {
  await navigate(page, "Backup & restore");
  await page.getByLabel("Select a Cellspray JSON backup").setInputFiles({
    name: "offline-backup.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(
    page.getByText("Backup ready to review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio").nth(1).check();
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await expect(
    page.getByText("Backup ready to review", { exact: true }),
  ).toHaveCount(0);
}

async function undo(page: Page) {
  await page
    .getByRole("button", { name: "Undo last restore", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Undo restore", exact: true })
    .click();
}

test("the downloaded HTML works offline through branding, invoice payments, reload, backup and customer-only printing", async ({
  page,
}) => {
  const monitoring = await offline(page);
  await page.goto(buyerURL);
  await expect(page).toHaveTitle("Cellspray — Invoice & Payment Tracker");
  await expect(page.locator(".brand")).toContainText("Cellspray");
  expect(
    await page
      .locator("script[src], script[type=module], link[rel=stylesheet]")
      .count(),
  ).toBe(0);
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start fresh", exact: true })
    .click();
  await navigate(page, "Business settings");
  await page.getByLabel("Business name", { exact: true }).fill("Aster Studio");
  await page
    .getByLabel("Business tagline (optional)", { exact: true })
    .fill("Design for independent businesses");
  await page.getByLabel("Email", { exact: true }).fill("hello@aster.example");
  await page
    .getByLabel("Business address", { exact: true })
    .fill("18 Orchard Avenue\nPortland, OR 97201");
  await page
    .getByRole("button", { name: "Teal invoice accent", exact: true })
    .click();
  await uploadLogo(page);
  await saveSettings(page);
  const branding = (await records(page)).settings;
  expect(branding.businessLogo).toMatch(/^data:image\/png;base64,/);
  await expect(page.locator(".workspace-card")).toContainText("Aster Studio");
  await expect(
    page
      .locator(".workspace-card")
      .getByRole("img", { name: "Aster Studio logo", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.locator(".invoice-preview")).toContainText(
    "Aster Studio",
  );
  await expect(editor.locator(".invoice-preview")).not.toContainText(
    /cellspray|billora/i,
  );
  await expect(
    editor.getByRole("img", { name: "Aster Studio logo", exact: true }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Add new client", exact: true })
    .click();
  await editor
    .getByLabel("Client / company name", { exact: true })
    .fill("Harbor Workshop");
  await editor
    .getByLabel("Email", { exact: true })
    .fill("billing@harbor.example");
  await editor
    .getByLabel("Item 1 description", { exact: true })
    .fill("Design consultation");
  await editor.getByLabel("Item 1 quantity", { exact: true }).fill("2");
  await editor.getByLabel("Item 1 unit price", { exact: true }).fill("175");
  await editor
    .getByRole("button", { name: "Add line item", exact: true })
    .click();
  await editor
    .getByLabel("Item 2 description", { exact: true })
    .fill("Creative delivery");
  await editor.getByLabel("Item 2 unit price", { exact: true }).fill("250");
  await editor.getByLabel("Discount (USD)", { exact: true }).fill("50");
  await editor.getByLabel("Tax (%)", { exact: true }).fill("10");
  await editor
    .getByLabel("Notes & payment instructions", { exact: true })
    .fill(
      "Thank you for working with Aster Studio. Please quote INV-0001 with your transfer.",
    );
  await expect(editor.locator(".grand-total")).toContainText("$605.00");
  await editor
    .getByRole("checkbox", { name: "Record a payment or deposit now" })
    .check();
  await editor.getByLabel("Deposit amount (USD)", { exact: true }).fill("105");
  await editor
    .getByRole("button", { name: "Save invoice", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  let saved = await records(page);
  expect(saved.clients).toHaveLength(1);
  expect(saved.invoices).toHaveLength(1);
  expect(saved.payments).toHaveLength(1);
  expect(saved.payments[0].amount).toBe(105);
  await navigate(page, "Overview");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total invoiced" })
      .locator(".metric-value"),
  ).toContainText("$605.00");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Total collected" })
      .locator(".metric-value"),
  ).toContainText("$105.00");
  await navigate(page, "Invoices");
  const row = page.locator("tbody tr").filter({ hasText: "INV-0001" });
  await expect(row.locator(".badge")).toHaveText("Partial");
  await expect(row).toContainText("$500.00");
  await row
    .getByRole("button", { name: "Record payment for INV-0001", exact: true })
    .click();
  const payment = page.getByRole("dialog");
  await payment.getByLabel("Amount (USD)", { exact: true }).fill("500");
  await payment
    .getByLabel("Reference (optional)", { exact: true })
    .fill("Offline settlement");
  await payment
    .getByRole("button", { name: "Save payment", exact: true })
    .click();
  await expect(payment).toHaveCount(0);
  await expect(row.locator(".badge")).toHaveText("Paid");
  saved = await records(page);
  expect(saved.payments.reduce((sum, entry) => sum + entry.amount, 0)).toBe(
    605,
  );
  expect(saved.settings).toEqual(branding);

  await page.reload();
  expect(await records(page)).toEqual(saved);
  await expect(page.locator(".workspace-card")).toContainText("Aster Studio");
  await expect(
    page
      .locator(".workspace-card")
      .getByRole("img", { name: "Aster Studio logo", exact: true }),
  ).toBeVisible();
  await navigate(page, "Invoices");
  await row
    .getByRole("button", { name: "Print INV-0001", exact: true })
    .click();
  const invoice = page.locator("#print-root");
  await expect(invoice).toContainText("Aster Studio");
  await expect(invoice).toContainText("Design for independent businesses");
  await expect(invoice).toContainText("hello@aster.example");
  await expect(invoice).not.toContainText(/cellspray|billora/i);
  await expect(
    invoice.getByRole("img", { name: "Aster Studio logo", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(
    invoice.getByRole("columnheader", { name: "Amount", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".app-shell")).not.toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page).toHaveTitle("INV-0001 — Aster Studio");
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.length).toBeGreaterThan(1000);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page).toHaveTitle("Cellspray — Invoice & Payment Tracker");
  await page.emulateMedia({ media: "screen" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();

  await navigate(page, "Backup & restore");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^cellspray-invoice-payment-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  const bytes = await readFile(backupPath!);
  expect(JSON.parse(bytes.toString())).toEqual(saved);
  await navigate(page, "Business settings");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Aster Studio Updated");
  await saveSettings(page);
  await navigate(page, "Payments");
  await page
    .locator("tbody tr")
    .filter({ hasText: "Offline settlement" })
    .getByRole("button", { name: /Delete payment/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete payment", exact: true })
    .click();
  const beforeRestore = await records(page);
  expect(beforeRestore.payments).toHaveLength(1);
  expect(beforeRestore.settings.businessName).toBe("Aster Studio Updated");
  await restore(page, bytes);
  expect(await records(page)).toEqual(saved);
  await expect(page.locator(".workspace-card")).toContainText("Aster Studio");
  await page.reload();
  expect(await records(page)).toEqual(saved);
  await navigate(page, "Backup & restore");
  await expect(
    page.getByRole("button", { name: "Undo last restore", exact: true }),
  ).toBeEnabled();
  await undo(page);
  expect(await records(page)).toEqual(beforeRestore);
  await navigate(page, "Invoices");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await expect(row).toContainText("$500.00");
  monitoring.verify();
});

test("the local-file build preserves older workspace and rollback keys without a storage migration", async ({
  page,
}) => {
  const monitoring = await offline(page);
  const timestamp = "2025-01-01T12:00:00.000Z";
  const legacy = emptyWorkspace();
  legacy.settings = {
    ...legacy.settings,
    businessName: "Legacy Workshop",
    invoicePrefix: "LEG",
    theme: "dark",
  };
  legacy.clients = [
    {
      id: "legacy-client",
      name: "Returning Client",
      email: "",
      phone: "",
      address: "",
      currency: "USD",
      paymentTermsDays: 30,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  legacy.invoices = [
    {
      id: "legacy-invoice",
      invoiceNumber: "LEG-0007",
      clientId: "legacy-client",
      issueDate: "2025-01-01",
      dueDate: "2030-01-31",
      currency: "USD",
      lineItems: [
        {
          id: "legacy-line",
          description: "Existing services",
          quantity: 1,
          unitPrice: 100,
        },
      ],
      discount: 0,
      taxLabel: "Tax",
      taxRate: 0,
      notes: "Previously saved invoice",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  legacy.payments = [
    {
      id: "legacy-payment",
      invoiceId: "legacy-invoice",
      paymentDate: "2025-01-02",
      amount: 20,
      method: "Bank transfer",
      reference: "Original deposit",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const rollback = structuredClone(legacy);
  rollback.settings.businessName = "Earlier Workshop";
  rollback.payments[0].amount = 10;
  const raw = JSON.stringify(legacy),
    rollbackRaw = JSON.stringify(rollback);
  // Establish the file document before preparing an existing buyer workspace.
  // Accessing file-origin storage at document-start can create a transient
  // storage area in Chromium's isolated test contexts.
  await page.goto(buyerURL);
  await page.evaluate(
    ({ raw, rollbackRaw, workspaceKey, rollbackKey }) => {
      localStorage.clear();
      localStorage.setItem(workspaceKey, raw);
      localStorage.setItem(rollbackKey, rollbackRaw);
    },
    { raw, rollbackRaw, workspaceKey, rollbackKey },
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".workspace-card")).toContainText(
    "Legacy Workshop",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), workspaceKey),
  ).toBe(raw);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), rollbackKey),
  ).toBe(rollbackRaw);
  expect((await records(page)).settings).not.toHaveProperty("businessLogo");
  await navigate(page, "Invoices");
  const row = page.locator("tbody tr").filter({ hasText: "LEG-0007" });
  await expect(row.locator(".badge")).toHaveText("Partial");
  await expect(row).toContainText("$80.00");
  await navigate(page, "Business settings");
  await page
    .getByLabel("Business tagline (optional)", { exact: true })
    .fill("Added after opening the buyer download");
  await saveSettings(page);
  const updated = await records(page);
  expect(updated.clients).toEqual(legacy.clients);
  expect(updated.invoices).toEqual(legacy.invoices);
  expect(updated.payments).toEqual(legacy.payments);
  expect(updated.settings.businessTagline).toBe(
    "Added after opening the buyer download",
  );
  await page.reload();
  expect(await records(page)).toEqual(updated);
  await navigate(page, "Backup & restore");
  await expect(
    page.getByRole("button", { name: "Undo last restore", exact: true }),
  ).toBeEnabled();
  await undo(page);
  expect(await records(page)).toEqual(rollback);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), rollbackKey),
  ).toBeNull();
  await page.reload();
  expect(await records(page)).toEqual(rollback);
  await expect(page.locator(".workspace-card")).toContainText(
    "Earlier Workshop",
  );
  monitoring.verify();
});

test("the offline buyer download handles blocked file storage without crashing", async ({
  page,
}) => {
  const monitoring = await offline(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Persistence denied", "SecurityError");
      },
    });
  });
  await page.goto(buyerURL);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Let’s keep things flowing.",
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "Business settings");
  await expect(
    page.getByRole("heading", { name: "Business settings", exact: true }),
  ).toBeVisible();
  monitoring.verify();
});
