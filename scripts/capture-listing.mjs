import { mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const repository = fileURLToPath(new URL("../", import.meta.url));
const appFile = resolve(
  process.env.CELLSPRAY_APP_HTML ||
    resolve(
      repository,
      "release/Cellspray-Invoice-Payment-Tracker/Cellspray-Invoice-Payment-Tracker.html",
    ),
);
const output = resolve(
  process.env.CELLSPRAY_LISTING_OUTPUT ||
    resolve(repository, "release/seller-images"),
);
const executablePath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const mark = await readFile(resolve(repository, "public/favicon.svg"), "utf8");
await stat(appFile);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  args: ["--no-sandbox"],
});
const appContext = await browser.newContext({
  viewport: { width: 1440, height: 1120 },
  deviceScaleFactor: 2,
  offline: true,
  acceptDownloads: true,
});
const compositionContext = await browser.newContext({
  viewport: { width: 2000, height: 1500 },
  deviceScaleFactor: 1,
  offline: true,
});

const dataImage = (bytes) =>
  `data:image/png;base64,${bytes.toString("base64")}`;
const sharedStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; width: 2000px; height: 1500px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #262538; background: #f4f3f9; -webkit-font-smoothing: antialiased; }
  .canvas { width: 100%; height: 100%; position: relative; padding: 72px 88px; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 38px; font-weight: 600; letter-spacing: -1px; }
  .brand svg { display: block; width: 58px; height: 58px; }
  .edition { margin-left: auto; padding: 13px 22px; color: #746395; background: #ebe5fa; border-radius: 8px; font-size: 22px; font-weight: 500; letter-spacing: .1px; }
  .heading { margin: 45px 0 0; font-size: 76px; line-height: 1.13; letter-spacing: -3px; font-weight: 600; }
  .subtitle { margin: 19px 0 0; font-size: 31px; line-height: 1.4; color: #737084; }
  .footer { position: absolute; left: 88px; right: 88px; bottom: 45px; display: flex; justify-content: space-between; align-items: center; gap: 30px; color: #777287; font-size: 22px; }
  .footer strong { color: #5e526f; font-weight: 500; }
  .frame { background: #fff; border: 1px solid #e2deed; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px #2824360c; }
  .frame img { display: block; width: 100%; height: auto; }
  .frame-bar { display: flex; align-items: center; justify-content: space-between; padding: 17px 20px; background: #fcfbff; border-bottom: 1px solid #eae6f2; color: #82788f; font-size: 17px; }
  .frame-dots { display: flex; gap: 6px; }
  .frame-dots i { width: 7px; height: 7px; border-radius: 50%; background: #d7d0e2; }
  .frame-label { color: #6f637e; font-size: 27px; font-weight: 500; margin-bottom: 18px; }
  .note { font-size: 25px; color: #747082; margin: 20px 0 0; line-height: 1.5; }
  .eyebrow { color: #8b78ad; font-size: 20px; font-weight: 500; letter-spacing: 2px; margin: 0 0 22px; }
  .pill { display: inline-flex; gap: 12px; align-items: center; color: #6d56b1; background: #eae3fb; border: 1px solid #ded3f5; font-size: 26px; padding: 14px 20px; border-radius: 8px; }
`;

const brand = `<div class="brand">${mark}<span>Cellspray</span><span class="edition">Invoice &amp; Payment Tracker</span></div>`;
const footer = (caption) =>
  `<div class="footer"><strong>${caption}</strong><span>Fictional sample data shown.</span></div>`;
const frame = (image, label) =>
  `<div class="frame"><div class="frame-bar"><span class="frame-dots"><i></i><i></i><i></i></span><span>${label}</span><span>Offline browser app</span></div><img src="${dataImage(image)}" alt="Actual app screenshot"></div>`;

async function settle(page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".toast").length === 0,
  );
  await page.evaluate(() => document.fonts.ready);
}

async function saveImage(filename, contents, extraStyles = "") {
  const page = await compositionContext.newPage();
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${sharedStyles}${extraStyles}</style></head><body>${contents}</body></html>`,
  );
  await page
    .locator("img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => image.decode())),
    );
  await page.evaluate(() => window.scrollTo(0, 0));
  const bounds = await page.evaluate(() => {
    const box = (element) => {
      const { x, y, width, height, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, bottom };
    };
    const footer = box(document.querySelector(".footer"));
    const contentBottom = Math.max(
      ...Array.from(document.querySelectorAll(".frame, .note, .open-card")).map(
        (element) => element.getBoundingClientRect().bottom,
      ),
    );
    return {
      scrollX,
      scrollY,
      canvas: box(document.querySelector(".canvas")),
      header: box(document.querySelector(".brand")),
      footer,
      contentBottom,
      footerGap: footer.y - contentBottom,
    };
  });
  if (
    bounds.scrollX !== 0 ||
    bounds.scrollY !== 0 ||
    bounds.canvas.x !== 0 ||
    bounds.canvas.y !== 0 ||
    bounds.canvas.width !== 2000 ||
    bounds.canvas.height !== 1500 ||
    bounds.header.y < 40 ||
    bounds.footerGap < 55
  ) {
    throw new Error(
      `Listing composition exceeds safe canvas bounds: ${filename} ${JSON.stringify(bounds)}`,
    );
  }
  console.log(`${filename} bounds: ${JSON.stringify(bounds)}`);
  const destination = resolve(output, filename);
  await page.screenshot({ path: destination });
  const details = await stat(destination);
  console.log(
    `${filename}: 2000 × 1500 px, ${Math.round(details.size / 1024)} KiB`,
  );
  await page.close();
}

try {
  let page = await appContext.newPage();
  await appContext.route(/^https?:\/\//, (route) => route.abort());
  try {
    await page.goto(pathToFileURL(appFile).href, { waitUntil: "load" });
  } catch (error) {
    if (!String(error).includes("ERR_BLOCKED_BY_ADMINISTRATOR")) throw error;
    // Respect managed browser policy. Render the same packaged bytes at an allowed
    // localhost origin, fulfilled in memory; no server or external network is used.
    const previewOrigin = "http://127.0.0.1:54321/cellspray-buyer";
    const appHtml = await readFile(appFile, "utf8");
    await appContext.route(previewOrigin, (route) =>
      route.fulfill({ contentType: "text/html", body: appHtml }),
    );
    console.log(
      "Managed Chromium blocks file://. Capturing the unchanged buyer HTML via an offline, intercepted localhost request. This capture does not establish local-file compatibility.",
    );
    await page.close();
    page = await appContext.newPage();
    await page.goto(previewOrigin, { waitUntil: "load" });
  }
  await page
    .getByRole("heading", { name: "Let’s keep things flowing." })
    .waitFor();
  await settle(page);
  const dashboard = await page.screenshot();

  await page
    .getByRole("button", { name: "Business settings", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Business tagline (optional)", exact: true })
    .fill("Independent creative studio");
  await page.getByRole("button", { name: "Teal invoice accent" }).click();
  // Original fictional customer logo, drawn locally and uploaded through the real app flow.
  const customerLogo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    context.strokeStyle = "#147d83";
    context.lineWidth = 13;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(24, 133);
    context.lineTo(24, 39);
    context.lineTo(90, 133);
    context.lineTo(90, 39);
    context.stroke();
    context.fillStyle = "#147d83";
    context.font = "600 74px sans-serif";
    context.fillText("Northline", 121, 102);
    context.font = "22px sans-serif";
    context.fillText("CREATIVE STUDIO", 126, 140);
    return canvas.toDataURL("image/png");
  });
  await page.getByLabel("Upload business logo").setInputFiles({
    name: "northline-sample.png",
    mimeType: "image/png",
    buffer: Buffer.from(customerLogo.split(",")[1], "base64"),
  });
  await page.getByText("Logo added", { exact: true }).waitFor();
  await settle(page);
  const branding = await page.locator(".branding-panel").screenshot();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await settle(page);
  await page.getByRole("button", { name: "Invoices", exact: true }).click();
  await page
    .getByRole("button", { name: "Print INV-0018", exact: true })
    .click();
  const invoice = await page.locator(".invoice-preview").screenshot();
  if (await page.locator(".invoice-preview").getByText("Cellspray").count()) {
    throw new Error("Software identity must not appear as the invoice issuer.");
  }
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Record payment for INV-0018", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Amount (USD)", exact: true })
    .fill("1200");
  await page
    .getByRole("textbox", { name: "Reference (optional)", exact: true })
    .fill("Deposit · project milestone");
  await page
    .getByRole("heading", { name: "Record a payment", exact: true })
    .click();
  const payment = await page
    .getByRole("dialog", { name: "Record a payment", exact: true })
    .screenshot();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Backup & restore", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup", exact: true })
    .click();
  const download = await downloadPromise;
  await page.getByLabel("Select a Cellspray JSON backup").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/json",
    buffer: await readFile(await download.path()),
  });
  await page
    .getByRole("heading", { name: "Backup ready to review", exact: true })
    .waitFor();
  await settle(page);
  const backup = await page.locator(".restore-panel").screenshot();

  await saveImage(
    "01-cover.png",
    `<main class="canvas">${brand}<div class="cover-layout"><div class="cover-copy"><p class="eyebrow">YOUR WORK. YOUR NUMBERS.</p><h1>Invoice &amp;<br>Payment<br>Tracker</h1><p class="cover-description">Invoices, clients, and payments.<br>A calmer way to keep track.</p><div class="cover-features"><span>Own business branding</span><span>Manual payment tracking</span><span>JSON backups</span></div><div class="open-card"><strong>Download • Extract</strong><span>Open in your browser</span></div></div><div class="cover-screenshot">${frame(dashboard, "Your workspace, on your device")}<p class="note">A clear overview of invoices, collections, and balances.</p></div></div>${footer("Desktop browser · Windows & Mac")}</main>`,
    `
    .cover-layout { display: grid; grid-template-columns: 568px minmax(0, 1fr); gap: 60px; margin-top: 86px; align-items: start; }
    .cover-copy { padding-top: 38px; }
    .cover-copy h1 { margin: 0; font-size: 98px; line-height: 1.12; font-weight: 600; letter-spacing: -4px; }
    .cover-description { color: #737084; font-size: 31px; line-height: 1.45; margin: 30px 0 0; }
    .cover-features { display: flex; flex-direction: column; gap: 20px; margin: 40px 0 0; color: #5c526a; font-size: 28px; }
    .cover-features span::before { content: '✓'; color: #7560db; font-size: 24px; padding-right: 16px; }
    .open-card { display: flex; flex-direction: column; gap: 9px; padding: 23px 25px; margin-top: 46px; border: 1px solid #ded4f2; border-radius: 10px; background: #eee7fb; color: #7059a6; font-size: 29px; line-height: 1.3; }
    .open-card strong { font-weight: 550; }
    .open-card span { font-size: 26px; }
    .cover-screenshot { margin-top: 12px; }
    .cover-screenshot .note { font-size: 26px; }
  `,
  );

  await saveImage(
    "02-business-branding.png",
    `<main class="canvas">${brand}<h1 class="heading">Make it yours.</h1><p class="subtitle">Your logo. Your details. Your invoice.</p><div class="branding-layout"><section><div class="frame-label">Set your business identity</div>${frame(branding, "Business Branding settings")}</section><section><div class="frame-label">Use it on customer invoices</div>${frame(invoice, "Print / Save as PDF")}<p class="note">Choose an invoice accent.<br>Print or save a clean PDF to share.</p></section></div>${footer("Software by Cellspray · Invoice identity by you")}</main>`,
    `
    .heading { font-size: 70px; margin-top: 40px; }
    .subtitle { font-size: 29px; }
    .branding-layout { display: grid; grid-template-columns: 915px minmax(0, 1fr); gap: 56px; margin-top: 34px; align-items: start; }
    .branding-layout .frame-bar { font-size: 15px; padding: 15px 16px; }
    .branding-layout .frame-label { font-size: 26px; }
    .branding-layout .note { font-size: 24px; line-height: 1.4; }
    .branding-layout > section:last-child { text-align: center; }
    .branding-layout > section:last-child .frame { max-width: 510px; margin: 0 auto; }
  `,
  );

  await saveImage(
    "03-payments-and-backups.png",
    `<main class="canvas">${brand}<h1 class="heading">Payments, in order.<br>Backups, in your hands.</h1><div class="backup-layout"><section><div class="frame-label">Manual payment tracking</div>${frame(payment, "Record a payment")}<p class="note">Deposits, partial payments, or the final balance.</p></section><section><div class="frame-label">JSON backups</div>${frame(backup, "Review before restoring")}<div class="restore-pills"><span class="pill">Merge</span><span class="pill">Replace</span><span class="pill">Undo last restore</span></div><p class="note">Download a copy and keep it somewhere safe.<br>Review a backup before changing your workspace.</p></section></div>${footer("Saved locally in your browser · Export backups regularly")}</main>`,
    `
    .heading { font-size: 69px; margin-top: 40px; }
    .backup-layout { display: grid; grid-template-columns: 668px minmax(0, 1fr); gap: 59px; margin-top: 47px; align-items: start; }
    .backup-layout .frame-bar { font-size: 15px; padding: 15px 16px; }
    .restore-pills { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .backup-layout .note { font-size: 25px; }
  `,
  );
} finally {
  await appContext.close();
  await compositionContext.close();
  await browser.close();
}
