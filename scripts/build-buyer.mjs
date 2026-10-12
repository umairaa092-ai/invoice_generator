import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const buyerDirectory = path.join(
  projectRoot,
  "release",
  "Cellspray-Invoice-Payment-Tracker",
);
export const buyerAppPath = path.join(
  buyerDirectory,
  "Cellspray-Invoice-Payment-Tracker.html",
);

export async function buildBuyerApp() {
  const result = await build({
    absWorkingDir: projectRoot,
    entryPoints: ["src/main.tsx"],
    outfile: "cellspray-buyer.js",
    bundle: true,
    write: false,
    minify: true,
    treeShaking: true,
    platform: "browser",
    format: "iife",
    target: "es2022",
    charset: "utf8",
    legalComments: "inline",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const script = result.outputFiles.find((file) =>
    file.path.endsWith(".js"),
  )?.text;
  const css = result.outputFiles.find((file) =>
    file.path.endsWith(".css"),
  )?.text;
  if (!script || !css)
    throw new Error("The buyer build did not produce both JavaScript and CSS.");
  const icon = await readFile(path.join(projectRoot, "public/favicon.svg"));
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#171a2b">
<meta name="application-name" content="Cellspray — Invoice &amp; Payment Tracker">
<meta name="description" content="Cellspray Invoice &amp; Payment Tracker. A private, downloadable browser workspace for your business invoices, clients, payments, and branding.">
<title>Cellspray — Invoice &amp; Payment Tracker</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${icon.toString("base64")}">
<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head><body><div id="root"></div>
<script>${script.replace(/<\/script/gi, "<\\/script")}</script>
</body></html>`;
  await mkdir(buyerDirectory, { recursive: true });
  await writeFile(buyerAppPath, html);
  return { file: buyerAppPath, bytes: Buffer.byteLength(html) };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await buildBuyerApp();
  process.stdout.write(
    `Buyer app built: ${result.file}\n${result.bytes.toLocaleString()} bytes; all application scripts, styles, and icons are embedded.\n`,
  );
}
