# Cellspray

## Invoice & Payment Tracker — User Guide

Cellspray brings clients, invoices, payments, and balances into one local browser workspace. Create a client, invoice, and initial payment together, then follow the same invoice through collection and reporting.

Your business is the invoice issuer. The business logo, name, contact information, and tagline you save identify your business on invoices. Cellspray remains the software brand in the application interface.

## 1. Open the downloaded product

Download the ZIP file and extract it before opening the tracker.

- On **Windows**, right-click the ZIP file and choose **Extract All**.
- On **Mac**, double-click the ZIP file to extract a folder.

In the extracted folder, double-click **Cellspray-Invoice-Payment-Tracker.html**. The supplied HTML file is the application. Keep it in a stable folder where you can find it again.

The intended workflow uses a current desktop version of **Chrome or Edge on Windows or Mac**. If your computer opens the file in another application, right-click it, choose **Open with**, and select your browser.

Use a normal browser window and the same browser profile each time. Keep the same filename and folder for day-to-day use. A different browser, profile, file location, or computer may open a separate local workspace.

The layout adapts to smaller screens for responsive viewing. Opening and retaining downloaded HTML files on mobile depends on the device and browser; desktop use is the intended delivery workflow.

## 2. Understand where your records live

The tracker saves records in local browser storage on your device. It does not require an account, and there is no cloud synchronization between browsers or computers.

Your saved workspace includes clients, invoices, payments, business settings, branding, and theme choice. Reloading the same file in the same browser normally returns to that workspace when browser storage remains available.

Keep a JSON backup because browser storage can be cleared or restricted. Private or incognito sessions may discard records when the session closes. Browser cleanup tools, browser-data deletion, and changing profiles or file locations can also make records unavailable.

Treat your exported backup as a copy of business records. Store it somewhere you can recover independently of the browser.

### JSON backup and invoice PDF

| File        | Purpose                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| JSON backup | Restore clients, invoices, payments, settings, and branding into the tracker. |
| Invoice PDF | Share or keep a readable copy of one invoice.                                 |

A PDF does not restore the workspace. Use **Download backup** regularly, especially before moving files, changing browsers, applying an update, or removing records.

## 3. Start with your own workspace

First use shows a clearly labeled sample workspace with fictional clients, invoices, and payments. You can explore its pages before entering real records.

When ready, select **Start fresh** and review the confirmation. This removes the sample clients, invoices, and payments. Then open **Business settings** and replace the sample business details with your own.

If you already have real records in the workspace, download a backup before using **Start fresh**. The confirmation removes the records currently loaded, including any you added.

You can revisit sample data with **Load demo workspace** in **Backup & restore**. Review the replacement confirmation and back up your current workspace first.

## 4. Set business information and branding once

Open **Business settings** and complete the **Business Branding** section:

1. Enter your **Business name** and optional **Business tagline**.
2. Drag your logo into the upload area or select **Choose image**.
3. Choose an **Invoice accent color**.
4. Complete the business contact information and invoice defaults below.
5. Select **Save settings** to apply your changes.

The workspace identity updates to your business name and logo. The same branding appears automatically in live invoice previews and printed invoices.

### Logo requirements

Use a PNG, JPG/JPEG, or WEBP image up to **2 MB**. PNG or WEBP works well for a transparent background.

The browser creates an optimized copy that fits within **600 × 300 pixels**, preserves the image proportions, and retains transparency where available. Only the processed copy is saved. A small source logo is not enlarged.

If an image cannot be read or has very large pixel dimensions, export a smaller valid logo image and try again. An unsuccessful upload leaves the current logo in place.

Use **Change logo** to upload a replacement, or **Remove logo** to clear it. Select **Save settings** afterward. Without a usable logo, the settings preview and workspace identity show business initials; customer invoices use the business name without an empty logo box.

**Reset branding** clears the logo and tagline and restores the default invoice accent after confirmation. It keeps your business name and contact details. Save settings to apply the reset.

### Invoice accent

Choose **Indigo, Navy, Teal, Emerald, Burgundy, or Charcoal**, or use a custom color. The hex field accepts a six-digit color such as **#245D72**.

The accent adds subtle invoice details and workspace identity highlights. Invoice text adjusts for readability while the application keeps its own Cellspray design.

### Business profile and invoice defaults

Add your email, phone, business address, default currency, invoice prefix, payment terms, tax label and rate, and payment instructions.

Currency, tax, terms, and payment instructions are defaults for future invoices. Existing invoice amounts and dates stay as saved. Business branding and contact details are used when previewing or printing invoices, including existing invoices.

### Using the app for more than one business

Each workspace has one business identity. If you operate multiple businesses, use a separate normal browser profile for each business and keep a separate set of JSON backups for each workspace. Changing the name, logo, or contact details in one workspace also changes the identity used on its existing invoice previews and prints; it does not create a separate business or preserve a previous invoice issuer. Keep each business's records and branding in its own workspace.

## 5. Create an invoice in one visit

Select **New invoice** from the top of the workspace.

### Invoice details

Check the invoice number, currency, issue date, and due date. Each invoice needs a unique number. The next number is suggested from your saved invoice prefix.

### Choose or create a client

Select an existing client, or choose **Add new client** inside the editor. Enter the client or company name, email, phone, billing address, and default currency. You can save the new client together with the invoice.

Selecting an existing client uses their currency and payment terms as starting values. Review these before saving.

### Products, services, and totals

Enter a description, quantity, and unit price for each line. Use **Add line item** for additional products or services and the remove action for unwanted lines.

The editor calculates each amount and shows a live invoice preview. A fixed-amount discount is deducted from the subtotal before percentage tax is applied. Monetary amounts round to cents.

Add notes or payment instructions. Review the subtotal, discount, tax, total, currency, and client details before saving.

### Optional initial payment or deposit

If you have already received money, enable **Record a payment or deposit now**. Enter the payment date, amount, method, and optional reference.

Select **Save invoice** once. The tracker saves the new client if needed, the invoice, and the optional payment together. The balance, status, client totals, and dashboard then update.

An unsaved invoice draft asks for confirmation when you close it. Choose **Keep editing** to return to the form or **Discard draft** to remove its unsaved details.

## 6. Manage invoices

Open **Invoices** to search by invoice number or client. Use status and currency filters to narrow the list.

Each invoice shows its total, paid amount, remaining balance, and status. Its actions are:

- **Edit:** update invoice details and save the changes.
- **Duplicate:** create a new invoice from its details with a fresh invoice number. Existing payments are not copied.
- **Print:** open the customer-facing invoice for printing or PDF saving.
- **Record payment:** add a payment against an outstanding balance.
- **Delete:** review the linked-payment count, then delete the invoice and those payments together. The client remains.

An invoice with recorded payments cannot change currency. Its total cannot be reduced below the amount already received. If a payment was entered incorrectly, delete that payment and record the corrected amount.

### Invoice statuses

| Status  | Meaning                                                                             |
| ------- | ----------------------------------------------------------------------------------- |
| Paid    | The balance is zero or below.                                                       |
| Partial | Some payment has been received, a balance remains, and the due date has not passed. |
| Unpaid  | No payment has been received, a balance remains, and the due date has not passed.   |
| Overdue | A balance remains after the due date, including partially paid invoices.            |

Paid amount is the sum of payments linked to the invoice. Balance is the invoice total minus those payments. Status and reports recalculate as records change.

## 7. Record and review payments

Select **Record payment**, choose the invoice, and review its current balance. Enter the payment date, amount, method, and reference, then select **Save payment**.

You can record deposits, partial payments, and final payments. The amount must be positive, use up to two decimal places, and stay within the remaining balance. The form does not accept future-dated received payments.

Payments are manual records of money already received. The tracker does not charge clients, transfer money, or connect to a payment processor.

In **Payments**, search by invoice, client, method, or reference, and filter by currency. Deleting a payment keeps its invoice and updates the paid amount, balance, status, dashboard, collections chart, and client totals.

For example, a **USD 1,000** invoice with a **USD 250** deposit has a **USD 750** balance. A later **USD 750** payment clears it. Deleting that later payment returns the balance to **USD 750**.

## 8. Manage clients

Use **Clients** to add, find, or edit client details. Each client has contact information, a billing address, default currency, payment terms, invoice count, and outstanding balances.

Client balances are grouped by invoice currency when a client has invoices in more than one currency. Changing client defaults does not convert existing invoice amounts.

Deleting a client shows the number of linked invoices and payments. One confirmation removes the client, all their invoices, and the payments for those invoices. Download a backup before deleting records you may need later.

## 9. Read the dashboard and currencies

Choose the dashboard currency at the top of the workspace. The tracker supports **USD, GBP, CAD, AUD, and EUR**.

The selected currency controls the dashboard’s financial totals and charts:

- **Total invoiced:** the value of invoices in that currency.
- **Total collected:** payments received against those invoices.
- **Outstanding:** the balances still to collect.
- **Overdue:** outstanding balances past their due dates.

The dashboard also shows recent invoices, collections for the last six months, receivables health, and aging buckets of **1–30, 31–60, 61–90, and 90+ days overdue**.

Amounts in different currencies stay separate. There is no exchange-rate conversion or combined total across currencies. Invoice and payment table filters are independent of the dashboard currency selection.

## 10. Print or save an invoice as PDF

In **Invoices**, select the invoice’s **Print** action. Review the document, then select **Print / Save as PDF**.

In the browser print dialog, choose **Save as PDF** or your preferred printer. Review the page preview and save or print. If browser-added headers or footers are unwanted, turn them off in the print options.

The document uses your business logo, name, tagline, contact details, and invoice accent. Customer invoices omit the Cellspray software identity. Send the PDF to your client yourself; the tracker does not send email.

## 11. Download, restore, merge, and undo backups

Open **Backup & restore** and select **Download backup**. The JSON file contains the entire saved workspace, including business branding and theme. Give each backup a safe home separate from your browser data.

### Review a backup before restoring

Choose a Cellspray JSON backup. The tracker validates it and shows the number of clients, invoices, and payments in the current workspace and selected file. Selecting the file does not change your records.

Choose the mode that matches your goal, then review the confirmation:

| Mode                | Result                                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge — recommended | Keeps current records and adds missing backup records. For matching IDs, the newer record wins; current records win ties. Populated current branding stays, and the backup fills empty branding fields. Other current business settings remain. |
| Replace             | Replaces the complete current workspace and settings with the selected backup, including its branding.                                                                                                                                          |

Use Merge when you want to bring in missing records while keeping work added since an older backup. Use Replace when the selected backup should become the complete workspace. Download a current backup before either action if you want a separate copy.

Invalid files or conflicting records are rejected with a message and leave the workspace unchanged. Choose an exported JSON backup; the upload limit is **10 MB**.

### Undo the last restore

Before a merge or replace, the tracker saves a rollback snapshot. **Undo last restore** returns to that snapshot, including its previous branding, and remains available after reloading while the snapshot is stored.

Undo removes changes made after that restore. Download a backup of those changes before undoing if you need to keep them. This action reverses the most recent restore; it is not a general undo button for everyday edits or deletions.

## 12. Move the tracker or use an updated copy

1. Open the current tracker in the browser and profile where your records are saved.
2. Select **Backup & restore → Download backup**.
3. Keep the original HTML file and exported JSON file until you have checked the new workspace.
4. Extract and open the new copy in your preferred normal browser window.
5. Choose the JSON backup in **Backup & restore**. Use Replace for a complete transfer into a fresh workspace, or Merge if the destination already contains records you want to keep.
6. Check your clients, invoices, payments, balances, and business branding.
7. Download a new backup after confirming the transfer.

Copying the HTML file alone does not move browser-stored records. The JSON backup carries the saved workspace.

## 13. Appearance and everyday habits

Use the light/dark control at the top of the workspace, or the **Theme** field in Business settings. Save settings when changing the theme through that form. Theme choice is saved with the workspace.

Keep one tracker tab open when making changes. If another tab saves newer data, the tracker blocks a stale save and asks you to reload. Reloading removes an unsaved draft, so keep its details before refreshing.

Download backups regularly and before large changes. Avoid clearing browser data until you have a verified copy of the records you need.

## 14. Troubleshooting

### The file opens in an editor or an unfamiliar app

Extract the ZIP first. Right-click **Cellspray-Invoice-Payment-Tracker.html**, choose **Open with**, and select a current desktop Chrome or Edge browser.

### My records appear to be missing

Try the original HTML filename and folder, browser, and browser profile. Confirm you are in a normal window. If the browser data was cleared or the original workspace is unavailable, use your latest JSON backup to restore the records.

### A logo upload fails

Choose a valid PNG, JPG/JPEG, or WEBP under 2 MB. Export a smaller image if its pixel dimensions are unusually large. Wait for processing to finish, then select Save settings.

### Changes cannot be saved

Read the notification. Browser storage may be restricted or full, or another tab may have changed the workspace. Use a normal browser window with local storage available and close competing tracker tabs. Download a backup before removing records or clearing browser data.

If a storage-recovery banner appears, use **Download original** to preserve the unreadable saved data before choosing Reset or restoring a valid backup. Keep your regular JSON backups available separately.

### A restore file is rejected

Select a JSON backup downloaded from the tracker. An incomplete file, unsupported format, or conflicting records cannot be restored safely. Your current workspace stays in place after the error.

### A PDF has extra browser text

Use the invoice’s Print action and review the browser print options. Disable browser headers and footers if you want to remove added page titles, dates, or addresses. Check the preview before saving the PDF.
