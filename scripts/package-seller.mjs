import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./build-buyer.mjs";
import { createZip } from "./lib/zip.mjs";

const prefix = "Cellspray-Etsy-Seller-Kit/";
const files = [];
for (const filename of [
  "01-cover.png",
  "02-business-branding.png",
  "03-payments-and-backups.png",
]) {
  files.push({
    name: prefix + filename,
    data: await readFile(
      path.join(projectRoot, "release/seller-images", filename),
    ),
  });
}
files.push({
  name: prefix + "ETSY-LISTING-COPY.txt",
  data: await readFile(
    path.join(projectRoot, "docs/seller/ETSY-LISTING-DRAFT.md"),
  ),
});
files.push({
  name: prefix + "UPLOAD-CHECKLIST.txt",
  data: `Cellspray — Invoice & Payment Tracker\nEtsy seller upload checklist\n\n1. Download Cellspray-Invoice-Payment-Tracker.zip separately. Keep this product ZIP intact for Etsy delivery.\n2. Extract this seller kit. Use 01-cover.png as the primary listing image and the other two PNGs as feature previews.\n3. In Etsy Shop Manager, create a new digital listing for an instant download. Choose the appropriate current software/product category in the listing editor.\n4. Paste the title and description from ETSY-LISTING-COPY.txt. Add the 13 suggested tags. Set your price and shop policies.\n5. Upload Cellspray-Invoice-Payment-Tracker.zip in the digital files area. Do not upload this seller-kit ZIP as the buyer product.\n6. Check the listing preview, download filename, price, policies, and digital-delivery options. Publish when ready.\n\nBuyer test before publishing:\nExtract the product ZIP on your desktop, open the HTML in a normal Chrome or Edge window, and follow START-HERE.pdf. Open the clickable website link in the PDFs on your phone and check its menu and settings. Try one invoice, a payment, a JSON backup, and PDF printing. Desktop Windows/macOS and native print dialogs should be checked on your target devices. Automated delivery checks used isolated Linux Chrome offline.\n\nProduct wording:\nThis is a downloadable local browser app with online phone access at https://cellspray-invoice-payment-tracker.umair-aa092.workers.dev/ . The website needs internet when loading; a Home Screen shortcut is not an offline phone install. Each device and the downloaded HTML use separate browser workspaces. Transfer records with JSON backup/restore; there is no cloud sync. Buyers configure their own business identity. Records are stored in their browser; regular JSON backups are essential. Payments are recorded manually. Each workspace has one business identity; separate browser profiles and backups keep multiple businesses separate.\n\nCurrent Etsy digital-listing help:\nhttps://help.etsy.com/hc/en-us/articles/115015628347-How-to-Manage-Your-Digital-Listings?segment=selling\n\nEtsy's listing editor shows the current accepted file types, upload limits, and publication requirements.\n`,
});
const directory = path.join(projectRoot, "downloads");
await mkdir(directory, { recursive: true });
const destination = path.join(directory, "Cellspray-Etsy-Seller-Kit.zip");
const archive = createZip(files);
await writeFile(destination, archive);
process.stdout.write(
  `Etsy seller kit: ${destination}\n${(archive.length / 1024).toFixed(0)} KB; ${files.length} seller-only files.\n`,
);
