# Periyar Taxi React — ESM setup

The frontend uses Vite, React and ES module `import`/`export` throughout.
The notification worker is now a `type: 'module'` service worker using the
browser Push API instead of Firebase compat `importScripts`.

## Steps on macOS

```bash
cd ~/Downloads/Periyar_Taxi_React_Frontend_ESM
cp .env.example .env
npm install
npm run check
npm run dev
```

Set `VITE_API_URL=http://localhost:8080/api`, browser-restricted
`VITE_GOOGLE_MAPS_KEY` and Firebase web credentials in `.env`.
Run `npm run build` for deployment after installing dependencies.
Web notification delivery requires HTTPS, browser consent, Firebase Cloud
Messaging configured with VAPID credentials, and end-to-end device tests.

There is no `node_modules`, `dist` or package lock in this ZIP. On first run,
`npm install` must be run inside the frontend directory too.
