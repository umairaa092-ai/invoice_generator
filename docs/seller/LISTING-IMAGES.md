# Etsy listing images

The three preview images use real screenshots of the downloadable HTML app, captured offline in an isolated Chromium browser profile. The sample customers, invoices, payments, and Northline Studio business identity are fictional. The Cellspray software mark is the original SVG used by the app.

## Generate images

Build the buyer HTML app first, then run the image script from the project checkout:

```sh
npm run build:buyer
node scripts/capture-listing.mjs
```

The script uses `CHROMIUM_PATH` when provided, or `/usr/bin/chromium`. It needs the repository's development dependencies. Buyers do not need this script, Node.js, or development dependencies.

Some managed cloud browsers block all `file://` navigation. The script respects that policy and falls back to the identical packaged HTML, served from memory through a Playwright-intercepted localhost request with the browser still offline. It prints that limitation when used. This screenshot fallback does not establish local-file compatibility; validate the delivered HTML separately in an unrestricted desktop browser before publication.

Optional paths:

```sh
CHROMIUM_PATH=/path/to/chrome \
CELLSPRAY_APP_HTML=/path/to/Cellspray-Invoice-Payment-Tracker.html \
CELLSPRAY_LISTING_OUTPUT=/path/to/seller-images \
node scripts/capture-listing.mjs
```

## Outputs

All images are **2000 × 1500 pixels** in PNG format, saved to `release/seller-images/`:

| File                          | Intended use                | Shown features                                                                    |
| ----------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `01-cover.png`                | Primary listing image       | Product name, real dashboard, offline desktop-browser opening steps               |
| `02-business-branding.png`    | Branding preview            | Actual upload/accent controls and customer-branded invoice preview                |
| `03-payments-and-backups.png` | Payments and data ownership | Actual manual-payment form, backup review, merge/replace choices, undo capability |

The script configures branding through the real settings UI, captures a real invoice, fills a payment form, downloads a real JSON backup, and stages it for review. It does not commit that payment or apply a restore. Screenshot composition uses local HTML, CSS, embedded PNG screenshots, and the SVG mark; no external fonts or images are loaded.

Before saving each PNG, the script checks that the canvas is exactly 2000 × 1500 at scroll position zero, the full brand header remains inside the image, and the main image content has at least 55 pixels of clearance above the footer. It prints these bounds with each output size.

These images are seller marketing assets. Keep them outside the buyer app folder and review them before uploading to a listing. They describe manual payment recording, browser-local storage, and JSON backups without promising cloud synchronization, automatic payment processing, or currency conversion. They make no usage-license restriction or one-business limit claim.

The included images were regenerated from the extracted buyer download using its actual `file://` URL, offline, in the verified isolated developer Chrome browser. The localhost fallback was not used for those final captures.
