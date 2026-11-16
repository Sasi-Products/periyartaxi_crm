# Periyar Taxi - Branch Center Picker Fix

Replace `src/pages/Branches.jsx` with the updated file (already included in this archive).

## Select a branch center

1. Open Branches & service boundaries.
2. Press **Pick branch center** or **Select center on map**.
3. Click the desired location on Google Maps. If the click is consumed by a marker, you can click that marker too.
4. Alternatively, pan/zoom until the crosshair is over the desired location, then press **Use map center**.
5. Or drag the yellow C marker to the desired location.
6. Confirm the latitude/longitude update in Branch settings, then press **Save branch**.

This change preserves the existing `centerLat`, `centerLng`, and `polygon` API fields; no backend migration is needed.
