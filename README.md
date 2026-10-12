# Billora

A browser-based invoice and payment workspace for independent businesses. Built with React, TypeScript, and Vite. No account, server, database, payment processor, or subscription is required.

## Run locally

Use Node.js 22 or newer (the cloud environment uses Node 24).

```sh
npm ci
npm run dev
```

Vite prints the development address. On first use, Billora loads a **clearly labeled demo workspace** with fictional records. Choose **Start fresh** to remove sample records, then enter your details in Business settings. You can reload sample data from Backup & restore after confirming replacement.

### Windows PowerShell

If PowerShell blocks `npm.ps1`, use the Windows command wrapper:

```powershell
npm.cmd ci
npm.cmd run dev
```

Recent npm versions require explicit permission for dependency installation scripts. This project approves the required `esbuild@0.25.12` installer in `package.json`. If npm reports a pending esbuild approval, run:

```powershell
npm.cmd install-scripts approve esbuild
npm.cmd rebuild esbuild --foreground-scripts
```

Approval records the package and version; rebuilding then runs its installer. The `install-scripts` command is available in npm 12. Older npm versions use the checked-in dependencies normally.

## The fast invoice flow

1. Select **New invoice**.
2. Choose a client or **Add new client** within the editor.
3. Add line items, currency, discount, and tax. The preview updates immediately.
4. Optionally select **Record a payment or deposit now**.
5. Save once. The client, invoice, and payment are persisted together, and every view updates.

Use the invoice table to edit, duplicate, print, record later payments, or delete invoices. Duplicates receive a fresh invoice number and do not copy payments. Browser **Print / Save as PDF** produces a clean invoice document. Share the exported PDF yourself; this version does not send email or process payments.

## Financial rules

- Line amounts round to cents. The fixed-amount discount is deducted before percentage tax; totals round to cents.
- Payments are stored independently. Paid amount, balance, invoice status, charts, and client totals are always derived from the current records.
- An outstanding invoice becomes overdue the day after its due date. Paid invoices stay paid regardless of the due date.
- Payments must be positive, use at most two decimal places, and cannot exceed the remaining balance. Future-dated payments cannot be recorded through the form.
- An invoice with recorded payments cannot change currency or be reduced below the amount already paid.
- USD, GBP, CAD, AUD, and EUR are supported. Dashboard totals and charts use only the selected currency. Client balances are grouped by invoice currency. No exchange rates or combined financial totals are used.
- Deleting an invoice removes its payments and keeps the client. Deleting a client removes their invoices and linked payments in one confirmation. Deleting a payment recalculates its invoice automatically.
- Default currency, tax, terms, and payment instructions apply to new invoices. Business profile details are used when previewing and printing invoices.

## Storage and backups

Everything stays in `localStorage` in **this browser, on this device, for this site's origin**. Theme choice is included in your workspace. Reloading keeps your records; clearing browser data, changing domains, or using another browser does not. No app data is sent to an external service. Browser storage is not a substitute for regular backups.

The workspace uses the `billora.workspace.v1` key and a versioned JSON schema. Generated financial totals are calculated rather than stored. Writes validate the whole workspace before replacing it. If storage is full or inaccessible, a save reports an error and the current displayed workspace stays intact. A change from another tab blocks stale saves and asks you to reload.

**Backup & restore** lets you download a JSON backup and inspect an uploaded file before changing any data:

- **Merge** is the default. Current records remain, missing records are added, and the record with the newer `updatedAt` wins for matching IDs. Current records win ties. Current business settings stay. A merge that would cause duplicate invoice numbers, broken relationships, or overpayments is rejected with an explanation.
- **Replace** explicitly replaces all workspace records and business settings after confirmation.
- A rollback snapshot is saved before either operation. **Undo last restore** returns to that snapshot, including after reloading. Changes made after the restore are removed when undoing, so export them first if needed.
- Malformed files, unsupported versions, invalid values, duplicate IDs/numbers, and missing relationships are rejected without changing the workspace. Files are limited to 10 MB.
- Unreadable saved data is preserved. The recovery banner lets you download the original bytes, reset explicitly, or restore a valid backup. Before recovering or resetting corrupted data, its raw contents are also retained under `billora.corrupt-recovery.v1`.

## Build and deploy

```sh
npm run build
npm run preview
```

The deployable output is **`dist/`**. Deploy that folder to any static host. There are no server-side functions, secrets, or required environment variables. The app uses internal page state rather than server routes, so it does not need an SPA route fallback.

| Host             | Build command   | Output directory |
| ---------------- | --------------- | ---------------- |
| Cloudflare Pages | `npm run build` | `dist`           |
| Vercel           | `npm run build` | `dist`           |
| Netlify          | `npm run build` | `dist`           |

Set the project root to this repository and select Node 22 or 24 in the host settings. Preview a deployment before using real records. To move data from a previous domain/browser, export there and restore on the new site. Publish your source repository before configuring Git-based deployment, or upload the build output directly.

## Verification

```sh
npm test
npm run test:e2e
```

Unit tests cover monetary rounding, tax/discount calculations, statuses, the payment lifecycle, currency isolation, numbering, backup validation, safe merges, and storage errors.

Browser tests exercise inline client creation and deposits, later partial/final payments, deletion rollback, backup download/merge/undo, newer-record preservation, dark mode persistence, mobile layout, print visibility, linked-record deletions, invalid input, malformed backups, and storage recovery.

The cloud test configuration uses `/usr/bin/chromium`. Elsewhere, set `CHROMIUM_PATH` to your installed Chromium/Chrome binary. Playwright starts Vite automatically, or reuses a development server already running on port 5173. Unit tests do not require a browser.

```sh
CHROMIUM_PATH=/path/to/chrome npm run test:e2e
npm run format
```

## Source organization

- `src/lib/`: typed entities, financial calculations, validation, storage, backups, and fictional demo data.
- `src/Workspace.tsx`: atomic workspace updates, shared actions, confirmations, recovery, and notifications.
- `src/pages/`: dashboard, invoice management/editor, clients, payments, settings, and backups.
- `src/components/`: accessible modal and field primitives, payment editor, status badges, and shared invoice preview.
- `src/styles.css`: responsive layouts, semantic actions, light/dark tokens, and print styles.
- `tests/`: domain and browser workflow tests.

This version intentionally omits authentication, cloud synchronization, email delivery, customer accounts, Stripe checkout, and a dedicated PDF library. Protect your device and export backups regularly when using business records.
