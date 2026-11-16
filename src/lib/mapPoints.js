// Branch JSON columns may be returned as an array or JSON text depending on the API/database.
// Normalize once at the boundary between stored data and Google Maps components.
export function normalizePoints(value) {
  let points = value;
  for (let attempt = 0; attempt < 2 && typeof points === 'string'; attempt += 1) {
    try { points = JSON.parse(points); } catch { return []; }
  }
  if (!Array.isArray(points)) return [];
  return points.flatMap(point => {
    if (!point || typeof point !== 'object' || point.lat == null || point.lng == null || point.lat === '' || point.lng === '') return [];
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
    return [{ lat, lng, ...(typeof point.label === 'string' ? { label: point.label } : {}) }];
  });
}
