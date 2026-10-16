# Martabak Abong — Public Portfolio Demo

I built Martabak Abong to help my father with his small martabak business. I wanted to make the everyday work of taking orders and tracking sales a little easier for him.

This public demo lets anyone explore the system without a login or database setup. It keeps the original Indonesian interface and mobile-first layout, centered on larger screens.

**Live demo:** `<ADD_VERCEL_DEMO_URL_AFTER_DEPLOYMENT>`

## What you can try

- Create, edit, delete, and restore orders with multiple martabak and optional customer details.
- Choose from 15 permanent menus or add temporary items with custom names and prices.
- Customize C/K/W toppings, Campur, Pandan, Kering, notes, and four levels of Mentega, Susu, and Gula.
- Track Selesai, Dibayar, and Diambil statuses, with finished orders moving to the bottom.
- Browse order history and daily/monthly sales statistics, with daily numbering based on WIB.
- Export CSV reports, print 58/80 mm receipts, download PNG receipts, and manage menu availability and prices.

## About the demo

All sample orders and customers are fictional. This demo is separate from the production application and stores changes only in your browser's `localStorage`. Your changes survive a refresh; **Atur Ulang** restores the sample data. Clearing site data removes your changes.

No data is sent to the business backend. Please use fictional customer details when exploring.

**Built with:** Next.js 16, React 19, TypeScript, Zod, Lucide, CSS, and Canvas. Data validation and storage are centralized in `src/lib/`; existing orders retain their saved names and prices after catalog edits.

Documentation and developer-facing code use English. App labels, messages, menus, and existing Indonesian domain terms stay in Indonesian.

## Screenshots

| Order queue | Monthly statistics |
| --- | --- |
| ![Mobile order queue](docs/screenshots/orders-mobile.png) | ![Monthly sales statistics](docs/screenshots/sales-mobile.png) |

[View the desktop layout](docs/screenshots/orders-desktop.png)

## Run locally

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No `.env` file is needed.

To preview the static production build:

```sh
npm run build
npm start
```

## Checks

```sh
npm test
npm run typecheck
npm run build
npm run security:scan
```

For browser tests, keep `npm start` running in another terminal:

```sh
npx playwright install chromium
npm run test:browser
```

On Windows, set `$env:DEMO_BROWSER_CHANNEL = 'msedge'` to use an installed Edge browser instead. See [VERIFICATION.md](VERIFICATION.md) for test coverage and limitations, including physical printing and security scanning.

## Deploy to Vercel

Use a dedicated demo repository and these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | **Other** |
| Node.js | 24 |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `out` |
| Environment variables | None |

`vercel.json` selects static hosting with `"framework": null` and includes security headers. Keep the **Other** preset with `out` to avoid the missing `routes-manifest.json` error.

Deploy the latest commit when ready, check the public site, and add its URL above.
