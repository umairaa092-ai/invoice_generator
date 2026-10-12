import { chromium } from "@playwright/test";
import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildBuyerApp, buyerDirectory, projectRoot } from "./build-buyer.mjs";
import { guideHtml } from "./lib/guide.mjs";
import { createZip } from "./lib/zip.mjs";

async function findBrowser() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ...[
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA,
    ]
      .filter(Boolean)
      .flatMap((root) => [
        path.join(root, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
      ]),
    chromium.executablePath(),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      /* Try the next installed browser. */
    }
  }
  throw new Error(
    "No browser found for guide PDF generation. Set CHROMIUM_PATH to Chrome/Edge, or run npx playwright install chromium. This is a seller build requirement, not a buyer requirement.",
  );
}

await buildBuyerApp();
const icon = await readFile(
  path.join(projectRoot, "public/favicon.svg"),
  "utf8",
);
const browser = await chromium.launch({
  executablePath: await findBrowser(),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.abort());
  for (const [source, destination, title] of [
    ["QUICK-START.md", "START-HERE.pdf", "Cellspray — Quick Start"],
    ["USER-GUIDE.md", "USER-GUIDE.pdf", "Cellspray — User Guide"],
  ]) {
    const markdown = await readFile(
      path.join(projectRoot, "docs/buyer", source),
      "utf8",
    );
    const html = guideHtml(markdown, icon, title);
    await page.setContent(html);
    await page.pdf({
      path: path.join(buyerDirectory, destination),
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-family:Arial;font-size:8px;color:#677083;width:100%;padding:0 17mm;display:flex;justify-content:space-between"><span>Cellspray · Invoice &amp; Payment Tracker</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      margin: { top: "17mm", right: "17mm", bottom: "19mm", left: "17mm" },
    });
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(buyerDirectory, "USAGE-TERMS.txt"),
  await readFile(path.join(projectRoot, "docs/buyer/USAGE-TERMS.txt")),
);
let notices =
  "Cellspray — Invoice & Payment Tracker\nThird-party open-source notices\n\nThe downloadable app bundles the components below. Their license notices and permissions are preserved here and in the bundled application where applicable.\n";
for (const dependency of ["react", "react-dom", "scheduler", "lucide-react"]) {
  const directory = path.join(projectRoot, "node_modules", dependency);
  const { version } = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8"),
  );
  const license = await readFile(path.join(directory, "LICENSE"), "utf8");
  notices += `\n${"=".repeat(70)}\n${dependency} ${version}\n${"=".repeat(70)}\n${license}\n`;
}
await writeFile(path.join(buyerDirectory, "THIRD-PARTY-NOTICES.txt"), notices);

const filenames = [
  "Cellspray-Invoice-Payment-Tracker.html",
  "START-HERE.pdf",
  "USER-GUIDE.pdf",
  "USAGE-TERMS.txt",
  "THIRD-PARTY-NOTICES.txt",
];
const files = [];
for (const filename of filenames)
  files.push({
    name: `Cellspray-Invoice-Payment-Tracker/${filename}`,
    data: await readFile(path.join(buyerDirectory, filename)),
  });
const zip = createZip(files);
const releasePath = path.join(
  projectRoot,
  "release/Cellspray-Invoice-Payment-Tracker.zip",
);
await writeFile(releasePath, zip);
await mkdir(path.join(projectRoot, "downloads"), { recursive: true });
const downloadPath = path.join(
  projectRoot,
  "downloads/Cellspray-Invoice-Payment-Tracker.zip",
);
await writeFile(downloadPath, zip);
process.stdout.write(
  `Etsy buyer ZIP: ${downloadPath}\n${(zip.length / 1024).toFixed(0)} KB; ${files.length} selected buyer files.\nAlso saved to ${releasePath}\n`,
);
