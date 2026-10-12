# Cellspray Etsy delivery files

[Download the buyer product ZIP](Cellspray-Invoice-Payment-Tracker.zip).

On GitHub, open the ZIP and select **Download raw file**. Upload that ZIP to your Etsy digital listing. Buyers extract it and double-click the HTML app; the included PDFs explain setup, branding, daily use, and backups.

The buyer ZIP contains only five product files. It includes no developer dependencies, source checkout, credentials, or customer records. Sample data is fictional and clearly labeled.

Listing description, title, and tags: [seller draft](../docs/seller/ETSY-LISTING-DRAFT.md).

[Download the Etsy seller kit](Cellspray-Etsy-Seller-Kit.zip) for three listing images, listing copy, and an upload checklist. Extract this kit and upload its PNGs as listing images; keep the buyer product ZIP as the digital file. The seller kit is for preparing your listing.

To rebuild: `npm run package:etsy`. A seller-side browser is needed to generate the PDF guides; buyers need only a desktop browser.

To regenerate the seller images and kit: `npm run package:seller`. Use `CHROMIUM_PATH` for the installed browser. In the Linux cloud environment, `bash scripts/install-test-browser.sh` prepares a vendor-verified test browser under `/tmp` without changing managed browser policies; its executable path is saved in `/tmp/cellspray-test-browser/executable-path.txt`.
