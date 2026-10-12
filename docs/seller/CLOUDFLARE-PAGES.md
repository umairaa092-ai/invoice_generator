# Cellspray on Cloudflare Pages

The ready-to-upload website is [Cellspray-Cloudflare-Pages.zip](../../downloads/Cellspray-Cloudflare-Pages.zip). This file contains the production website, with `index.html` at the ZIP root and its assets alongside it. Keep this ZIP intact for the dashboard upload.

## Direct dashboard upload

1. Sign in at [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Open **Workers & Pages → Create application → Get started → Drag and drop your files**. If the dashboard initially shows Workers options, find the Pages option before choosing the asset upload.
3. Enter a project name, such as `cellspray-invoice-payment-tracker`.
4. Upload **Cellspray-Cloudflare-Pages.zip**, then select **Deploy site**.
5. Open the actual `pages.dev` URL Cloudflare assigns. The project name can change if already in use; use the URL shown by the dashboard rather than assuming a particular address is reserved.

Cloudflare accepts a ZIP or a single folder for dashboard Direct Upload. Do not upload the Etsy buyer ZIP, seller-kit ZIP, or complete source repository ZIP here. The website files need to be at the archive root, rather than inside a wrapping `dist/` directory.

## Check the live site

Open the assigned HTTPS link on your desktop and phone. Confirm the Cellspray header, customer business settings/logo, a client and invoice, manual payment recording, and a JSON backup download/restore. On desktop, check the invoice's Print / Save as PDF action. The first visit shows clearly labeled fictional sample data; choose Start fresh and enter your own business settings before real use.

For a phone shortcut, use Chrome's **Add to Home screen** on Android or Safari's **Share → Add to Home Screen** on iPhone. The shortcut opens the hosted website. This build requires internet when loading the website; it does not include a service worker for offline installation.

Each browser and device stores its own workspace locally. Hosting makes the app reachable through a web link; it does not add account login, cloud record synchronization, or payment processing. Download a JSON backup from the old browser/file/domain and restore it on the new website to transfer records. Keep regular backups.

Use the verified live link in the Etsy instructions. A QR code can point to that same link later.

## Future updates

For a Direct Upload project, regenerate the upload ZIP after changes with:

```sh
npm run package:cloudflare
```

Upload the new ZIP to the same project as a new deployment, then select **Save and Deploy**. Keep the production domain stable so the browser workspace remains on the same origin. A preview deployment or different domain has separate browser storage.

Direct Upload projects do not switch to Git integration later. If you want automatic deployments from this GitHub repository, create a Git-integrated Pages project instead: production branch `main`, build command `npm run build`, output directory `dist`, repository root as the project root, and Node 24 (or supported Node 22+). Cloudflare connects to GitHub through your account; no app secrets or backend are needed.

## Verification and publication status

The local production app was built and browser-tested. The Direct Upload workflow was checked against [Cloudflare's official Pages documentation](https://developers.cloudflare.com/pages/get-started/direct-upload/) using its [official documentation repository](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/pages/get-started/direct-upload.mdx).

Preparing this ZIP and uploading it to GitHub does not publish a Cloudflare site. No Cloudflare account or deployment credential is connected to this workspace. Publication must complete in the account's dashboard; after deployment, check the actual assigned live URL.
