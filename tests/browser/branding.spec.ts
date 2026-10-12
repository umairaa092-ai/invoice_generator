import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyWorkspace } from "../../src/lib/seed";
import type { Workspace } from "../../src/lib/types";

test.setTimeout(60_000);

type ImageFixture = { name: string; mimeType: string; buffer: Buffer };

async function navigate(page: Page, label: string) {
  const toggle = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .locator("nav")
    .getByRole("button", { name: label, exact: true })
    .click();
}

async function records(page: Page): Promise<Workspace> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("billora.workspace.v1")!),
  );
}

async function fresh(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start fresh", exact: true })
    .click();
  await navigate(page, "Business settings");
}

async function imageFixture(
  page: Page,
  mimeType = "image/png",
  width = 1200,
  height = 600,
  transparent = true,
): Promise<ImageFixture> {
  const base64 = await page.evaluate(
    async ({ mimeType, width, height, transparent }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      if (!transparent) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.fillStyle = "#345d8c";
      context.fillRect(width / 4, height / 4, width / 2, height / 2);
      context.fillStyle = "#a493db";
      context.beginPath();
      context.arc(
        width / 2,
        height / 2,
        Math.min(width, height) / 8,
        0,
        Math.PI * 2,
      );
      context.fill();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("Fixture encoding failed")),
          mimeType,
          0.9,
        ),
      );
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    { mimeType, width, height, transparent },
  );
  return {
    name: `business-logo.${mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1]}`,
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  };
}

async function upload(page: Page, fixture: ImageFixture) {
  await page
    .getByLabel("Upload business logo", { exact: true })
    .setInputFiles(fixture);
  await expect(
    page.getByRole("group", { name: "Business logo upload" }),
  ).toHaveAttribute("aria-busy", "false");
}

async function saveSettings(page: Page) {
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save settings", exact: true }),
  ).toBeDisabled();
}

async function logoMetadata(page: Page, source: string) {
  return page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      alpha: context.getImageData(0, 0, 1, 1).data[3],
    };
  }, source);
}

async function restore(
  page: Page,
  workspace: Workspace,
  mode: "merge" | "replace",
) {
  await navigate(page, "Backup & restore");
  await page.getByLabel("Select a Billora JSON backup").setInputFiles({
    name: "branding-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(workspace)),
  });
  await expect(
    page.getByText("Backup ready to review", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("radio")
    .nth(mode === "merge" ? 0 : 1)
    .check();
  const action = mode === "merge" ? "Merge backup" : "Replace workspace";
  await page.getByRole("button", { name: action, exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: action, exact: true })
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

test("PNG, JPG and transparent WEBP are optimized, persist, and can be removed or reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fresh(page);
  await expect(
    page.locator(".branding-preview-card .business-logo-initials"),
  ).toBeVisible();
  await expect(page.locator(".brand svg.brand-mark")).toHaveAttribute(
    "viewBox",
    "0 0 40 40",
  );
  await expect(page.locator(".brand img")).toHaveCount(0);
  await page.getByLabel("Business name", { exact: true }).fill("Orbit Studio");
  await page
    .getByLabel("Business tagline (optional)", { exact: true })
    .fill("Independent design, thoughtfully made");
  await page
    .getByRole("button", { name: "Teal invoice accent", exact: true })
    .click();
  await upload(page, await imageFixture(page));
  await expect(
    page
      .locator(".branding-preview-card")
      .getByRole("img", { name: "Orbit Studio logo", exact: true }),
  ).toBeVisible();
  await saveSettings(page);
  const png = (await records(page)).settings.businessLogo!;
  expect(png).toMatch(/^data:image\/png;base64,/);
  expect(png.length).toBeLessThanOrEqual(1_048_576);
  expect(await logoMetadata(page, png)).toEqual({
    width: 600,
    height: 300,
    alpha: 0,
  });
  await expect(page.locator(".workspace-card")).toContainText("Orbit Studio");
  await expect(page.locator(".workspace-card")).toContainText(
    "Business workspace",
  );
  await expect(
    page
      .locator(".workspace-card")
      .getByRole("img", { name: "Orbit Studio logo", exact: true }),
  ).toBeVisible();
  await page.reload();
  expect((await records(page)).settings.businessLogo).toBe(png);
  await navigate(page, "Business settings");
  await expect(
    page.getByLabel("Business tagline (optional)", { exact: true }),
  ).toHaveValue("Independent design, thoughtfully made");
  await expect(
    page.getByLabel("Invoice color hex", { exact: true }),
  ).toHaveValue("#147d83");

  await upload(page, await imageFixture(page, "image/jpeg", 180, 90, false));
  await saveSettings(page);
  expect(
    await logoMetadata(page, (await records(page)).settings.businessLogo!),
  ).toEqual({ width: 180, height: 90, alpha: 255 });
  await upload(page, await imageFixture(page, "image/webp", 450, 1200, true));
  await saveSettings(page);
  const webp = await logoMetadata(
    page,
    (await records(page)).settings.businessLogo!,
  );
  expect(webp.height).toBe(300);
  expect(webp.width).toBe(113);
  expect(webp.alpha).toBe(0);
  expect(Math.abs(webp.width / webp.height - 450 / 1200)).toBeLessThan(0.005);

  await page.getByRole("button", { name: "Remove logo", exact: true }).click();
  await expect(
    page.locator(".branding-preview-card .business-logo-initials"),
  ).toHaveText("OS");
  await saveSettings(page);
  expect((await records(page)).settings.businessLogo).toBe("");
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".invoice-business-logo"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog").locator(".preview-brand"),
  ).toContainText("Orbit Studio");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await upload(page, await imageFixture(page, "image/png", 100, 50));
  await page.getByLabel("Invoice color hex", { exact: true }).fill("#245d72");
  await page
    .getByRole("button", { name: "Reset branding", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset branding", exact: true })
    .click();
  await saveSettings(page);
  const reset = (await records(page)).settings;
  expect(reset.businessName).toBe("Orbit Studio");
  expect(reset.businessLogo).toBe("");
  expect(reset.businessTagline).toBe("");
  expect(reset.invoiceAccentColor).toBe("#7560db");
  expect(errors).toEqual([]);
});

test("saved branding flows through inline-client invoices, payments, print, dark mode and mobile", async ({
  page,
}) => {
  await fresh(page);
  await page.getByLabel("Business name", { exact: true }).fill("Orbit Studio");
  await page
    .getByLabel("Business tagline (optional)", { exact: true })
    .fill("Design for independent businesses");
  await page.getByLabel("Invoice color hex", { exact: true }).fill("#ffffff");
  await upload(page, await imageFixture(page));
  await saveSettings(page);
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(
    editor.getByRole("img", { name: "Orbit Studio logo", exact: true }),
  ).toBeVisible();
  await expect(editor.locator(".invoice-preview")).toContainText(
    "Design for independent businesses",
  );
  await expect(editor.locator(".invoice-preview")).not.toContainText(
    /billora/i,
  );
  await editor.getByLabel("Invoice number", { exact: true }).fill("BRAND-0001");
  await editor
    .getByRole("button", { name: "Add new client", exact: true })
    .click();
  await expect(
    editor.getByLabel("Upload business logo", { exact: true }),
  ).toHaveCount(0);
  await editor
    .getByLabel("Client / company name", { exact: true })
    .fill("Inline Brand Client");
  await editor
    .getByLabel("Item 1 description", { exact: true })
    .fill("Brand identity design");
  await editor.getByLabel("Item 1 unit price", { exact: true }).fill("1000");
  await editor
    .getByRole("checkbox", { name: "Record a payment or deposit now" })
    .check();
  await editor.getByLabel("Deposit amount (USD)", { exact: true }).fill("250");
  await editor
    .getByRole("button", { name: "Save invoice", exact: true })
    .click();
  const saved = await records(page);
  expect(saved.clients).toHaveLength(1);
  expect(saved.invoices).toHaveLength(1);
  expect(saved.payments).toHaveLength(1);
  await navigate(page, "Invoices");
  const row = page.locator("tbody tr").filter({ hasText: "BRAND-0001" });
  await expect(row).toContainText("$750.00");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await page
    .getByRole("button", { name: "Record payment for BRAND-0001", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Amount (USD)", { exact: true })
    .fill("750");
  await page
    .getByRole("dialog")
    .getByLabel("Reference (optional)", { exact: true })
    .fill("Brand final");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save payment", exact: true })
    .click();
  await expect(row.locator(".badge")).toHaveText("Paid");
  await navigate(page, "Payments");
  await page
    .locator("tbody tr")
    .filter({ hasText: "Brand final" })
    .getByRole("button", { name: /Delete payment/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete payment", exact: true })
    .click();
  await navigate(page, "Invoices");
  await expect(row.locator(".badge")).toHaveText("Partial");
  await expect(row).toContainText("$750.00");
  await page
    .getByRole("button", { name: "Print BRAND-0001", exact: true })
    .click();
  const document = page.locator("#print-root");
  await expect(
    document.getByRole("img", { name: "Orbit Studio logo", exact: true }),
  ).toBeVisible();
  await expect(document).not.toContainText(/billora/i);
  await page.emulateMedia({ media: "print" });
  await expect(
    document.getByRole("columnheader", { name: "Amount", exact: true }),
  ).toBeVisible();
  await expect(document).toContainText("Design for independent businesses");
  const ratio = await document.locator(".preview-title").evaluate((element) => {
    const rgb = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (channels: number[]) =>
      channels
        .map((value) => {
          const s = value / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (total, value, index) =>
            total + value * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    const ink = luminance(rgb(getComputedStyle(element).color)),
      paper = luminance(
        rgb(
          getComputedStyle(element.closest(".invoice-preview")!)
            .backgroundColor,
        ),
      );
    return (Math.max(ink, paper) + 0.05) / (Math.min(ink, paper) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.45);
  await page.emulateMedia({ media: "screen" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await navigate(page, "Business settings");
    await expect(page.locator(".branding-panel")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "New invoice", exact: true })
      .click();
    const amount = page
      .getByRole("dialog")
      .locator(".preview-items")
      .getByRole("columnheader", { name: "Amount", exact: true });
    await amount.scrollIntoViewIfNeeded();
    const box = await amount.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await expect(
      page
        .getByRole("dialog")
        .getByRole("img", { name: "Orbit Studio logo", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
  }
});

test("upload errors and failed processing preserve the current logo; drag and drop works", async ({
  page,
}) => {
  await fresh(page);
  const png = await imageFixture(page, "image/png", 200, 100);
  await upload(page, png);
  await saveSettings(page);
  const original = (await records(page)).settings.businessLogo;
  const corrupt = Buffer.from(png.buffer);
  corrupt.fill(0, 33);
  for (const fixture of [
    {
      name: "logo.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
    },
    {
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    },
    { name: "mismatch.jpg", mimeType: "image/jpeg", buffer: png.buffer },
    { name: "corrupt.png", mimeType: "image/png", buffer: corrupt },
  ]) {
    await page
      .locator(".toast-error .icon-btn")
      .evaluateAll((buttons) =>
        buttons.forEach((button) => (button as HTMLButtonElement).click()),
      );
    await upload(page, fixture);
    await expect(page.locator(".toast-error").last()).toBeVisible();
    expect((await records(page)).settings.businessLogo).toBe(original);
    await expect(page.locator(".branding-preview-card img")).toHaveAttribute(
      "src",
      original!,
    );
    await expect(
      page.getByRole("button", { name: "Save settings", exact: true }),
    ).toBeDisabled();
  }
  await page.evaluate(() => {
    (
      window as unknown as {
        previousGetContext: typeof HTMLCanvasElement.prototype.getContext;
      }
    ).previousGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await upload(page, png);
  await expect(page.locator(".toast-error").last()).toContainText(
    /process this logo/i,
  );
  expect((await records(page)).settings.businessLogo).toBe(original);
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.getContext = (
      window as unknown as {
        previousGetContext: typeof HTMLCanvasElement.prototype.getContext;
      }
    ).previousGetContext;
  });
  const jpeg = await imageFixture(page, "image/jpeg", 360, 180, false);
  const transfer = await page.evaluateHandle(
    ({ bytes, type, name }) => {
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(bytes)], name, { type }));
      return data;
    },
    { bytes: [...jpeg.buffer], type: jpeg.mimeType, name: jpeg.name },
  );
  await page
    .locator(".logo-dropzone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(
    page.getByRole("group", { name: "Business logo upload" }),
  ).toHaveAttribute("aria-busy", "false");
  await saveSettings(page);
  expect((await records(page)).settings.businessLogo).not.toBe(original);
});

test("JSON download, merge priority and fill-empty, exact replace, and undo include branding", async ({
  page,
}) => {
  await fresh(page);
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Current Studio");
  await page
    .getByLabel("Business tagline (optional)", { exact: true })
    .fill("Current tagline");
  await page
    .getByRole("button", { name: "Burgundy invoice accent", exact: true })
    .click();
  await upload(page, await imageFixture(page, "image/png", 200, 100));
  await saveSettings(page);
  const current = await records(page);
  await navigate(page, "Backup & restore");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const downloaded = await downloading;
  const filename = await downloaded.path();
  expect(JSON.parse(await readFile(filename!, "utf8"))).toEqual(current);
  const alternate = await imageFixture(page, "image/png", 160, 160);
  const incoming = structuredClone(current);
  incoming.settings = {
    ...incoming.settings,
    businessName: "Backup Studio",
    businessLogo: `data:image/png;base64,${alternate.buffer.toString("base64")}`,
    businessTagline: "From the backup",
    invoiceAccentColor: "#24466b",
  };
  await restore(page, incoming, "merge");
  expect((await records(page)).settings).toEqual(current.settings);
  await page.reload();
  await navigate(page, "Backup & restore");
  await undo(page);
  expect(await records(page)).toEqual(current);
  const emptyBranding = structuredClone(current);
  emptyBranding.settings = {
    ...emptyBranding.settings,
    businessName: "",
    businessLogo: "",
    businessTagline: "",
    invoiceAccentColor: "",
  };
  await restore(page, emptyBranding, "replace");
  await expect(page.locator(".workspace-card")).toContainText("Your Business");
  await restore(page, incoming, "merge");
  expect((await records(page)).settings).toEqual(incoming.settings);
  await undo(page);
  expect(await records(page)).toEqual(emptyBranding);
  await restore(page, incoming, "replace");
  expect(await records(page)).toEqual(incoming);
  await undo(page);
  expect(await records(page)).toEqual(emptyBranding);
});

test("old workspaces remain editable, and an undecodable embedded logo falls back without a blank invoice box", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const legacy = emptyWorkspace();
  await page.evaluate(
    (workspace) =>
      localStorage.setItem("billora.workspace.v1", JSON.stringify(workspace)),
    legacy,
  );
  await page.reload();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await navigate(page, "Business settings");
  expect((await records(page)).settings).not.toHaveProperty("businessLogo");
  expect((await records(page)).settings).not.toHaveProperty("businessTagline");
  expect((await records(page)).settings).not.toHaveProperty(
    "invoiceAccentColor",
  );
  await page.getByLabel("Business name", { exact: true }).fill("Legacy Studio");
  await saveSettings(page);
  expect((await records(page)).settings.businessName).toBe("Legacy Studio");
  await expect(page.locator(".toast-error")).toHaveCount(0);
  const fixture = await imageFixture(page, "image/png", 100, 50);
  const corrupt = Buffer.from(fixture.buffer);
  corrupt.fill(0, 33);
  const workspace = await records(page);
  workspace.settings.businessName = "";
  workspace.settings.businessLogo = `data:image/png;base64,${corrupt.toString("base64")}`;
  await page.evaluate(
    (workspace) =>
      localStorage.setItem("billora.workspace.v1", JSON.stringify(workspace)),
    workspace,
  );
  await page.reload();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.locator(".workspace-card .business-logo-initials"),
  ).toHaveText("YB");
  await expect(page.locator(".workspace-card img")).toHaveCount(0);
  await expect(page.locator(".workspace-card")).toContainText("Your Business");
  await page.getByRole("button", { name: "New invoice", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".invoice-business-logo"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog").locator(".preview-brand"),
  ).toContainText("Your Business");
  await expect(
    page.getByRole("dialog").locator(".invoice-preview"),
  ).not.toContainText(/billora/i);
  expect(errors).toEqual([]);
});
