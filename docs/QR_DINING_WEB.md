# Browser-first table QR ordering

Printed codes use HTTPS `/dine/<kitchen-id>/<table-id>` links. An app installation and location permission are not required to browse, choose dishes or keep a basket. Existing sign-in is required only at checkout; backend order authorization is unchanged.

## Flow

1. The public dining-entry API validates that the kitchen is published and the table is active. No table is remembered before this succeeds.
2. The browser shows the kitchen cover, table/area, searchable menu and category filters, including drinks. A fixed, safe-area-aware basket control remains reachable on a phone. Closed kitchens can be browsed but ordering is disabled.
3. The validated table is retained for two hours in the tab session. Blocked browser storage falls back to memory for that tab. Expired/cross-kitchen table sessions cannot silently select dine-in.
4. Sign-in does not reset the public QR entry or unmount its checkout. The existing basket persists across refresh where browser storage is available.
5. Checkout starts in dine-in with the scanned table. It requests a canonical server quote and sends the table ID and stable order idempotency key. Dine-in no longer overwrites the user's saved delivery address.
6. The new order opens directly in Orders. The foreground page refreshes its status every five seconds and announces acceptance/preparation changes. This is not a claim of iOS background push support in an uninstalled browser tab.

## Deploy

The web project must deploy the root `vercel.json` SPA rewrite along with the production build. This fixes direct scans and refreshes on `/dine/...` and `/orders`. API requests still go to the separately configured command API; no private credentials are added to the web bundle.

The API deployment must include the public `/v1/dining/:merchant/:table` route. Set backend `APP_WEB_URL` to the public HTTPS web origin used on printed codes. An inactive table returns an actionable error; it must never be bypassed on the client.

Observed before deployment on 25 November 2026:

- Web `/dine/qa-preview/table-preview`: HTTP 404 before the app shell loaded.
- API `/v1/dining/qr-probe-no-kitchen/table-probe`: HTTP 401; the deployed build did not recognize the public route. A current build should return `KITCHEN_UNAVAILABLE` for that deliberately nonexistent kitchen.

## Validation

Automated browser-component coverage includes guest menu access, search, sign-in with a preserved scanned table, server quote/order payload, exact new-order navigation, kitchen acceptance polling, expired sessions, storage blocked by the browser, inactive table codes and closed kitchens. Existing backend dining/zone/order checks remain in use. Run `npm test`, `npm run lint` and `npm run build` from this web repository.

Manual iPhone Safari and Android Chrome review remains required after deployment. The local visual-preview browser could not attach during this session. Verify widths 320–430px, long names, zoom, keyboard visibility and safe-area basket placement on actual devices. Do not report a real order or notification send as tested using the isolated fixtures.


Final automated results: 26 web tests passed (serial execution to avoid host memory pressure), 7 backend dining tests passed, TypeScript passed and the production Vite build completed. Reports: `qa/qr-browser-final-tests.log`, `qa/qr-browser-types.log`, `qa/qr-browser-build.log`; backend report is in the mobile repository at `qa/qr-browser-backend-tests.log`. The existing large-chunk build advisory remains; it is not a failed build. The DOM test runner does not implement `window.scrollTo`, so scroll placement still needs actual-browser review.
