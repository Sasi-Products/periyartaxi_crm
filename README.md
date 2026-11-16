# Periyar Taxi React web application

## Native ES module update

All React source uses ES module imports/exports. The web push service worker is a native module registered with `type: "module"` (not the legacy Firebase compat `importScripts` implementation). See `ESM_SETUP.md`.

## Start

```bash
cd frontend
cp .env.example .env
npm install
npm run check
npm run dev
```

API expected at `http://localhost:8080/api` unless `VITE_API_URL` is set. `npm run build` produces `dist/`. Requires Node 22.16+ (Node 24 recommended) and React 18. HTTPS is required for production geolocation, notifications and Razorpay.

## Role-based pages

- **Super Admin:** Dashboard; Trips; New Booking; Branch boundaries; Dynamic Fare/Packages; Drivers; Vehicles; Multi-day Assignments; Staff/Permissions; Live Tracking; Attendance; Payroll; Payments; Expenses; Analytics; Detailed Analytics; Notifications; Audit.
- **Admin:** Any subset of operational pages granted by Super Admin. Pricing and branch-boundary editing are Super Admin only.
- **Driver:** Duty clock-in/out; availability; live GPS; incoming trip offers; assigned trips; start-OTP; trip completion; charges/cash; document verification; attendance; payslip.
- **Customer:** OTP sign-in; Local, Local Package, Outstation, Driver for Rent, Valet; map and location search; schedule; booking for others; route review; trips/cancel; start OTP; favorites; driver call; Razorpay; ratings; notifications; profile.

## Credentials in frontend `.env`

- `VITE_GOOGLE_MAPS_KEY`: browser restricted to your domain, enable Maps JavaScript API and Places API (Google Maps JavaScript loading).
- `VITE_API_URL`: backend API endpoint including `/api`.
- `VITE_FIREBASE_*`: public Firebase web app configuration; `VITE_FIREBASE_VAPID_KEY` for web push.

Never use your secret Google backend API key or Razorpay secret in Vite variables. They become public in the web bundle.

## Important details

- The boundary editor adds polygon points by **clicking Google Map**; it does not rely on `DrawingManager` (removed from newer Google Maps versions).
- For a passenger quote, backend Google Routes API must be configured; fallback map is informational only without API keys.
- Driver GPS tracking while on duty is best effort and only works while web app is running. For Android/iOS background tracking, implement native app services with consent and foreground notifications.
- Customer start OTP is only returned to customer/authorized dispatch; not exposed to drivers. Driver enters it to start a ride.
- Razorpay Checkout loads only when passenger chooses Pay Online for a **completed** unpaid ride.
- FCM web push is opt-in via Notifications page, and requires a secure origin/valid Firebase configuration.
- `public/.htaccess` is copied to `dist/.htaccess` on Vite build; use it for Plesk/Apache single-page app fallback.

## Deploy on Plesk

1. Local build: `npm run build`.
2. Upload **contents of `dist/`** to frontend document root (e.g., your chosen customer/admin domain). Preserve `.htaccess`.
3. Put backend under its separate API domain. Configure MySQL environment variables and Node startup file `server.js`; keep `.env` and `uploads/` outside public folders where possible.
4. Update `VITE_API_URL`, Maps browser key domain restrictions, CORS allowed origins, provider webhooks, Firebase FCM domain settings. **Build again** after changing Vite env variables.
5. Enable HTTPS and ensure that OPTIONS/POST/GET work through Plesk reverse proxy. Test direct deep links such as `/trips` and `/ride`.

## Verification status

The source JSX passes parser checks. Full npm install/production build was unavailable in the creation environment. Run `npm install`, `npm run build` and manually test the four role paths in your local setup before deploying to real users.

## Google Maps branch polygon robustness update

`src/lib/mapPoints.js` converts branch polygons received as MySQL JSON arrays or JSON text into validated `{lat, lng}` points. `MapCanvas` now tolerates missing, malformed, and stringified marker, polygon, and route arrays. The Branches editor normalizes polygons when reading them and before saving to the API; undo/reset/click operations work with arrays only. Tests: `node --test tests/mapPoints.test.js`.
# periyartaxi_crm
