/**
 * Haversine formula: computes great-circle distance between two GPS points.
 * Used to sum up distance between consecutive tracked location points.
 */
function toRad(value) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(coord1, coord2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Given an array of {latitude, longitude} points recorded during tracking,
 * sum the distance between consecutive points.
 *
 * Note on precision: this sums straight-line (chord) distances between
 * consecutive GPS fixes, so it will always slightly UNDER-count vs. the
 * actual road distance on curves/turns — the tighter the point spacing, the
 * smaller that gap. The background tracking service now samples every ~10m
 * / 4s (was 20m / 5s), which cuts this error roughly in half. For
 * near-exact road distance, the remaining gap needs a road-snapping API
 * (e.g. Google Roads API "snapToRoads") run on the point array — that's a
 * paid API call and a good candidate for a future enhancement, not
 * something purely client-side GPS sampling can fully close.
 */
export function calculateRouteDistanceKm(points = []) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistanceKm(points[i - 1], points[i]);
  }
  return Math.round(total * 100) / 100;
}

export function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '0h 0m';
  const ms = new Date(endTime) - new Date(startTime);
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
