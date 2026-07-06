# GuideWisey Marketplace Frontend

Independent Vite + React + TypeScript frontend for the GuideWisey marketplace and seller
storefronts. This repository is separate from `gw-frontend`; it does not require or modify that
application.

## Features

- Marketplace landing page and seller storefronts
- Seller resolution from production subdomains, localhost subdomains, or path fallbacks
- Product collections, category filters, details, stock states, and multi-image galleries
- Persistent browser cart with quantity and inventory limits
- MVP order-request checkout with pickup/delivery details and no online payment
- Typed API client with timeout/error handling
- Real `api.guidewisey.com` integration with explicitly enabled local mocks
- Shared GuideWisey session/CSRF authentication and marketplace seller portal
- Responsive, mobile-first UI and accessible loading/empty/error states
- Persistent light/dark theme with system preference fallback
- i18next foundation with English strings
- Vitest/React Testing Library unit tests and Playwright browser tests
- Vercel SPA deployment configuration

## Requirements

- Node.js 22.13+ or 24+ (current LTS recommended)
- npm 10+

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app runs at <http://localhost:3002>. The port is intentionally different from the main
GuideWisey frontend, which can remain on port 3000.

The default development API origin is `http://localhost:8000` (the client appends `/api`). To run
without the Django backend, set `VITE_USE_MOCK_API=true`.
Available local example shops are:

- <http://localhost:3002/shop/rishikitchen>
- <http://localhost:3002/shop/demo>
- <http://rishikitchen.localhost:3002>
- <http://demo.localhost:3002>

Modern browsers resolve `*.localhost` to the loopback address. If a local environment does not,
add an entry such as `127.0.0.1 rishikitchen.localhost` to the machine's hosts file.

## Environment

| Variable                 | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `VITE_APP_ENV`           | `local` or `production`; controls safe URL defaults    |
| `VITE_API_BASE_URL`      | Backend origin; the client appends `/api` when needed  |
| `VITE_MAIN_FRONTEND_URL` | Main GuideWisey frontend used for login                |
| `VITE_MARKETPLACE_URL`   | Marketplace origin used for authentication return URLs |
| `VITE_USE_MOCK_API`      | `true` explicitly enables local catalog mocks          |

Local development uses ports 8000, 3000, and 3002 for the backend, main frontend, and marketplace.
Production uses `api.guidewisey.com`, `www.guidewisey.com`, and
`https://marketplace.guidewisey.com`.
Production must set `VITE_USE_MOCK_API=false`.

### Expected API routes

```text
GET    /marketplace/shops/
GET    /marketplace/shops/:shopSlug/
GET    /marketplace/shops/:shopSlug/products/
GET    /marketplace/products/:productId/
GET    /marketplace/cart/
POST   /marketplace/cart/items/
PATCH  /marketplace/cart/items/:productId/
DELETE /marketplace/cart/items/:productId/
POST   /marketplace/orders/
GET    /marketplace/orders/:orderId/
GET    /marketplace/seller/orders/
GET    /auth/me
POST   /accounts/logout/
GET    /seller/dashboard/
GET    /seller/products/
GET    /seller/orders/
GET    /seller/shop/
```

The cart UI persists locally for immediate offline-safe UX; matching session cart APIs are
available for server synchronization. Authentication is owned by the configured main frontend.
Anonymous users opening `/seller` are redirected to its login with the configured marketplace
`/seller` URL in the `next` parameter. The marketplace only reads the shared session and exposes
logout.

## Scripts

```bash
npm run dev             # development server on port 3002
npm run build           # type-check and production build
npm run preview         # preview production build on port 3002
npm run typecheck       # TypeScript project checks
npm run lint            # ESLint
npm run format:check    # verify Prettier formatting
npm test                # unit/component tests
npm run test:coverage   # coverage report with >80% enforced thresholds
npm run test:e2e        # Playwright browser tests
```

Playwright needs its Chromium binary once per development machine:

```bash
npx playwright install chromium
```

## Shop routing

Resolution order is hostname first, path fallback second:

| URL                                        | Resolved slug  |
| ------------------------------------------ | -------------- |
| `https://rishikitchen.shop.guidewisey.com` | `rishikitchen` |
| `http://rishikitchen.localhost:3002`       | `rishikitchen` |
| `http://localhost:3002/shop/rishikitchen`  | `rishikitchen` |

Only lowercase-safe slugs containing letters, numbers, and internal hyphens are accepted. Reserved
hosts such as `www`, `market`, and `shop` are not treated as seller slugs.

The production DNS design is:

```text
CNAME marketplace -> gw-marketplace-fe.vercel.app
CNAME *.shop  -> gw-marketplace-fe.vercel.app
A/CNAME api   -> gw-backend deployment
```

Configure these domains in the same Vercel project:

```text
marketplace.guidewisey.com
*.shop.guidewisey.com
api.guidewisey.com
```

Wildcard DNS alone is not sufficient: Vercel must also have the wildcard domain assigned and its
certificate issued. `vercel.json` rewrites all paths to `index.html`, allowing React Router to
handle direct storefront and product URLs.

## Structure

```text
src/
  cart/          cart state and persistence
  components/    reusable marketplace UI
  config/        validated environment access
  data/          development mock catalog
  hooks/         async data state
  pages/         route-level screens
  services/      typed API boundary
  types/         marketplace domain types
  utils/         hostname/path resolution and links
tests/e2e/       Playwright user journeys
```

## Deployment

Vercel detects Vite and uses:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Set production environment variables in Vercel before deploying. For another static host, publish
`dist` and configure an SPA fallback from all unknown paths to `/index.html`.
