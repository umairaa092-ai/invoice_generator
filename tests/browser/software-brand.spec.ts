import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyWorkspace } from "../../src/lib/seed";

test.setTimeout(60_000);

const PRODUCT_TITLE = "Cellspray — Invoice & Payment Tracker";
const LEGACY_WORKSPACE_KEY = "billora.workspace.v1";
const LEGACY_ROLLBACK_KEY = "billora.rollback.v1";

async function seedLegacyWorkspace(page: Page) {
  await page.goto("/");
  const logo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 90;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#23647d";
    context.fillRect(15, 15, 150, 60);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(90, 45, 20, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL("image/png");
  });
  const workspace = emptyWorkspace();
  const timestamp = "2026-01-01T12:00:00.000Z";
  workspace.settings = {
    ...workspace.settings,
    businessName: "Legacy Supply",
    businessLogo: logo,
    businessTagline: "Independent supplies, carefully selected",
    invoiceAccentColor: "#23647d",
    email: "billing@legacysupply.example",
    phone: "+44 20 5555 0142",
    address: "18 Orchard Road\nBrighton BN1 1AA",
    paymentInstructions: "Please quote the invoice number with your transfer.",
  };
  workspace.clients = [
    {
      id: "legacy-client-1",
      name: "Harbor Workshop",
      email: "accounts@harbor.example",
      phone: "+1 555 0102",
      address: "24 Dock Street",
      currency: "USD",
      paymentTermsDays: 30,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  workspace.invoices = [
    {
      id: "legacy-invoice-1",
      invoiceNumber: "KEEP-0001",
      clientId: "legacy-client-1",
      issueDate: "2026-01-01",
      dueDate: "2030-01-31",
      currency: "USD",
      lineItems: [
        {
          id: "legacy-line-1",
          description: "Workshop supplies",
          quantity: 1,
          unitPrice: 500,
        },
      ],
      discount: 0,
      taxLabel: "Tax",
      taxRate: 0,
      notes: "Please quote KEEP-0001 with your transfer.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  workspace.payments = [
    {
      id: "legacy-payment-1",
      invoiceId: "legacy-invoice-1",
      paymentDate: "2026-01-02",
      amount: 100,
      method: "Bank transfer",
      reference: "Existing deposit",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const rollback = structuredClone(workspace);
  rollback.settings.businessName = "Legacy Supply Earlier";
  rollback.settings.businessTagline = "The previous business tagline";
  rollback.settings.invoiceAccentColor = "#414653";
  rollback.invoices[0].lineItems[0].unitPrice = 300;
  rollback.payments[0].amount = 50;
  const raw = JSON.stringify(workspace);
  const rollbackRaw = JSON.stringify(rollback);
  await page.evaluate(
    ({ raw, rollbackRaw }) => {
      localStorage.clear();
      localStorage.setItem("billora.workspace.v1", raw);
      localStorage.setItem("billora.rollback.v1", rollbackRaw);
      localStorage.setItem("billora.demo", "true");
    },
    { raw, rollbackRaw },
  );
  await page.reload();
  return { workspace, rollback, raw, rollbackRaw };
}

async function navigate(page: Page, label: string) {
  await page
    .locator("nav")
    .getByRole("button", { name: label, exact: true })
    .click();
}

async function persisted(page: Page) {
  return page.evaluate(() => ({
    raw: localStorage.getItem("billora.workspace.v1"),
    rollbackRaw: localStorage.getItem("billora.rollback.v1"),
    marker: localStorage.getItem("billora.demo"),
    keys: Object.keys(localStorage).sort(),
  }));
}

async function expectSoftwareBrand(page: Page) {
  await expect(page).toHaveTitle(PRODUCT_TITLE);
  await expect(page.locator(".brand")).toContainText("Cellspray");
  await expect(page.locator(".brand")).toContainText("Business Tools");
  await expect(page.locator(".brand svg.brand-mark")).toHaveAttribute(
    "viewBox",
    "0 0 40 40",
  );
  await expect(page.locator(".brand img")).toHaveCount(0);
  await expect(page.locator(".breadcrumb")).toContainText(
    "Invoice & Payment Tracker",
  );
  await expect(page.locator("body")).not.toContainText(/billora/i);
  await expect(page.getByLabel(/billora/i)).toHaveCount(0);
  await expect(
    page.locator(
      '[title*="billora" i], [placeholder*="billora" i], [alt*="billora" i]',
    ),
  ).toHaveCount(0);
}

test("Cellspray labels all six pages while existing legacy storage and customer identity remain unchanged", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { raw, rollbackRaw } = await seedLegacyWorkspace(page);
  for (const label of [
    "Overview",
    "Invoices",
    "Clients",
    "Payments",
    "Business settings",
    "Backup & restore",
  ]) {
    await navigate(page, label);
    await expectSoftwareBrand(page);
    await expect(page.locator(".workspace-card")).toContainText(
      "Legacy Supply",
    );
    await expect(page.locator(".workspace-card")).toContainText(
      "Business workspace",
    );
    await expect(page.locator(".workspace-card")).not.toContainText(
      /cellspray|billora/i,
    );
    await expect(
      page
        .locator(".workspace-card")
        .getByRole("img", { name: "Legacy Supply logo", exact: true }),
    ).toBeVisible();
    expect(await persisted(page)).toEqual({
      raw,
      rollbackRaw,
      marker: "true",
      keys: ["billora.demo", LEGACY_ROLLBACK_KEY, LEGACY_WORKSPACE_KEY].sort(),
    });
  }
  await page
    .getByLabel("Select a Cellspray JSON backup", { exact: true })
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken json"),
    });
  await expect(page.locator(".toast-error")).toBeVisible();
  await expect(page.locator(".toast-error")).toContainText(/valid JSON/i);
  await expectSoftwareBrand(page);
  expect((await persisted(page)).raw).toBe(raw);
  expect((await persisted(page)).rollbackRaw).toBe(rollbackRaw);
  await page.reload();
  await expectSoftwareBrand(page);
  expect(await persisted(page)).toEqual({
    raw,
    rollbackRaw,
    marker: "true",
    keys: ["billora.demo", LEGACY_ROLLBACK_KEY, LEGACY_WORKSPACE_KEY].sort(),
  });
  expect(errors).toEqual([]);
});

test("customer invoices stay software-free, Cellspray backups preserve data, and the existing rollback still undoes", async ({
  page,
}) => {
  const { workspace, rollback, raw, rollbackRaw } =
    await seedLegacyWorkspace(page);
  await navigate(page, "Invoices");
  const row = page.locator("tbody tr").filter({ hasText: "KEEP-0001" });
  await expect(row).toContainText("$500.00");
  await expect(row).toContainText("$100.00");
  await expect(row).toContainText("$400.00");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await page
    .getByRole("button", { name: "Edit KEEP-0001", exact: true })
    .click();
  const live = page.getByRole("dialog").locator(".invoice-preview");
  await expect(
    live.getByRole("img", { name: "Legacy Supply logo", exact: true }),
  ).toBeVisible();
  await expect(live).toContainText(workspace.settings.businessName);
  await expect(live).toContainText(workspace.settings.businessTagline!);
  await expect(live).toContainText(workspace.settings.email);
  await expect(live).toContainText(workspace.settings.phone);
  await expect(live).toContainText("18 Orchard Road");
  await expect(live).not.toContainText(/cellspray|billora/i);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Print KEEP-0001", exact: true })
    .click();
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page).toHaveTitle("KEEP-0001 — Legacy Supply");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page).toHaveTitle(PRODUCT_TITLE);
  await page.emulateMedia({ media: "print" });
  const printed = page.locator("#print-root");
  await expect(
    printed.getByRole("img", { name: "Legacy Supply logo", exact: true }),
  ).toBeVisible();
  await expect(printed).toContainText("Harbor Workshop");
  await expect(printed).toContainText("$400.00");
  await expect(
    printed.getByRole("columnheader", { name: "Amount", exact: true }),
  ).toBeVisible();
  await expect(printed).not.toContainText(/cellspray|billora/i);
  await page.emulateMedia({ media: "screen" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  expect((await persisted(page)).raw).toBe(raw);
  await navigate(page, "Backup & restore");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^cellspray-invoice-payment-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const path = await download.path();
  expect(JSON.parse(await readFile(path!, "utf8"))).toEqual(workspace);
  expect((await persisted(page)).rollbackRaw).toBe(rollbackRaw);
  await expect(
    page.getByRole("button", { name: "Undo last restore", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Undo last restore", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Undo restore", exact: true })
    .click();
  const restored = await persisted(page);
  expect(JSON.parse(restored.raw!)).toEqual(rollback);
  expect(restored.rollbackRaw).toBeNull();
  expect(restored.keys.some((key) => key.startsWith("cellspray."))).toBe(false);
  await expect(page.locator(".workspace-card")).toContainText(
    "Legacy Supply Earlier",
  );
  await expectSoftwareBrand(page);
  await page.reload();
  expect(JSON.parse((await persisted(page)).raw!)).toEqual(rollback);
  await expect(
    page
      .locator(".workspace-card")
      .getByRole("img", { name: "Legacy Supply Earlier logo", exact: true }),
  ).toBeVisible();
  await expectSoftwareBrand(page);
});
