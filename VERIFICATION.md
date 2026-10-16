# Public Demo Verification

Verification date: October 16, 2026 (Asia/Jakarta).

Checks were performed only in the `martabak-abong-public` folder. No production database or repository was accessed, and nothing was pushed or deployed.

| Check | Result |
| --- | --- |
| `npm test` | Passed: 8 domain tests, without a database |
| `npm run typecheck` | Passed |
| `npm run build` | Passed: all pages exported as static files to `out/` |
| `npm run security:scan` | Passed: source and build output checked; no credential pattern findings |
| `npm run test:browser` | Passed: headless Microsoft Edge against the production export |
| Browser network | 270 requests; 0 external HTTP requests; 0 API/login requests; 0 page errors |
| Responsive layout | 320, 390, and 1440 px viewports; no horizontal overflow; shell width no greater than 480 px |
| Screenshots | Fictional data; mobile, desktop, history, and statistics views inspected visually |

## Domain coverage

- Seed data is created once when storage is empty; no production records or customer information are copied.
- Changes persist when storage is reopened; independent browsers have independent data.
- Order creation, editing, and deletion; temporary menu items; quantities; C/K/W toppings; dynamic codes and names; Campur, Pandan, Kering; notes; and four customization levels.
- Totals use catalog prices or saved snapshots rather than permanent menu prices submitted by the form.
- Catalog changes preserve existing order names and prices; unavailable menu items cannot be added to new orders.
- Daily numbering resets at midnight WIB, and deleted numbers are never reused.
- Repeated submissions with the same request ID do not duplicate orders; stale versions are rejected.
- Selesai orders move to the bottom with reduced opacity; Diambil automatically marks an order as Dibayar; restoring an order preserves payment.
- Pagination without duplicates; search; WIB day/month boundaries; quantity, revenue, average price, and empty statistics.
- Reset restores orders, menus, and counters. Corrupted data is not silently discarded and can be recovered through reset. Full storage produces an error.
- CSV export neutralizes spreadsheet formulas and excludes customer information. Receipt content uses full menu names and excludes generated menu codes.

## Browser coverage

The tested workflow includes opening the application without logging in; creating an order with three line items; changing toppings, customizations, prices, and quantities; refreshing and editing; opening and refreshing a receipt; downloading PNG receipts at 58/80 mm (with PNG signatures verified); exercising printing; changing statuses; downloading CSV; viewing monthly statistics; restoring and deleting orders; editing menu availability and prices; refreshing; and resetting the demo. Browser checks also verify the absence of JavaScript page errors and external/API/login requests.

Screenshots are saved in `docs/screenshots/`. The generated `test-results/browser-summary.json` is ignored by Git. Set `DEMO_BROWSER_CHANNEL=msedge` to use Edge and `DEMO_URL` when the preview address differs from the default.

## Audit and verification limits

- Login, authentication, sessions, logout, proxy, API routes, ORM/database drivers, migrations, setup/admin scripts, environment configuration, and production documentation have been removed.
- Previous verification images were replaced with screenshots containing fictional data. Retained application assets are martabak icons and have been inspected.
- The initial duplicate had no Git metadata. A dedicated demo repository is now present; the latest security scan included tracked content and 43 historical text blobs and passed. Keep this demo's history separate from production.
- Secret scanning is heuristic. No credentials or business endpoints were found in the inspected source or static output.
- Browser tests exercise `window.print` with the system dialog replaced and check print-media visibility rules. Physical printers and thermal output have not been tested.
- Chrome, Firefox, Safari, and physical devices have not been tested; browser verification used desktop Edge with mobile and desktop viewport sizes.
- The initial Windows sandbox build encountered a filesystem permission restriction in a generated Next.js output directory; the build passed with normal filesystem permissions.
- The first Vercel deployment attempt reported a missing `out/routes-manifest.json`. The configuration combined the Next.js preset with the static export folder. `vercel.json` now uses `"framework": null` (the Other preset) to serve `out/` as static files. A hosted deployment of this correction and its response headers remain unverified.

## Language conventions

Documentation and developer-facing text use English. Indonesian is retained for application labels, user-facing messages, menu names, sample order content, existing route/domain terms, and test selectors or assertions that match them. Screenshot filenames use English, and browser tests generate the same filenames referenced in the README.

After the language update, all 8 domain tests, TypeScript checking, browser-test syntax validation, README screenshot reference checks, and the security scan passed. Application behavior was unchanged, so the production build and full browser workflow results above refer to the preceding functional verification.

## Remaining publication steps

1. Use the dedicated demo repository, uploading only files that are not ignored by Git.
2. Configure the demo Vercel project with Framework Preset **Other**, Node.js 24, `npm ci`, `npm run build`, output directory `out`, and no environment variables. `vercel.json` overrides the framework preset, build command, and output directory for the next deployment.
3. Deploy when ready, run a smoke test at the public URL, and replace the live demo URL placeholder in the README.
