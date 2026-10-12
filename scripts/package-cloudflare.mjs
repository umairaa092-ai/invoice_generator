import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./build-buyer.mjs";
import { createZip } from "./lib/zip.mjs";

const dist = path.join(projectRoot, "dist");
const files = [];
async function collect(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const filename = prefix + entry.name;
    if (entry.isDirectory())
      await collect(path.join(directory, entry.name), filename + "/");
    else if (entry.isFile())
      files.push({
        name: filename,
        data: await readFile(path.join(directory, entry.name)),
      });
    else
      throw new Error(
        "Deployment assets must be ordinary files and directories.",
      );
  }
}
await collect(dist);
if (!files.some((file) => file.name === "index.html"))
  throw new Error("Build the app first: dist/index.html is missing.");

let notices =
  "Cellspray — Invoice & Payment Tracker\nThird-party open-source notices\n\n";
for (const dependency of ["react", "react-dom", "scheduler", "lucide-react"]) {
  const directory = path.join(projectRoot, "node_modules", dependency);
  const { version } = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8"),
  );
  const license = await readFile(path.join(directory, "LICENSE"), "utf8");
  notices += `\n${"=".repeat(70)}\n${dependency} ${version}\n${"=".repeat(70)}\n${license}\n`;
}
files.push({ name: "THIRD-PARTY-NOTICES.txt", data: Buffer.from(notices) });
const zip = createZip(files);
await mkdir(path.join(projectRoot, "downloads"), { recursive: true });
const destination = path.join(
  projectRoot,
  "downloads/Cellspray-Cloudflare-Pages.zip",
);
await writeFile(destination, zip);
process.stdout.write(
  `Cloudflare Pages upload ZIP: ${destination}\n${(zip.length / 1024).toFixed(0)} KB; index.html at the ZIP root; ${files.length} deployment files.\n`,
);
