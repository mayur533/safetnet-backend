import type {LatLng} from '../stores/liveTrackingStore';

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineDistanceMeters = (pointA: LatLng, pointB: LatLng): number => {
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLng = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const toCartesian = (point: LatLng) => {
  const latRad = toRadians(point.latitude);
  const lngRad = toRadians(point.longitude);
  const cosLat = Math.cos(latRad);
  return {
    x: EARTH_RADIUS_METERS * cosLat * Math.cos(lngRad),
    y: EARTH_RADIUS_METERS * cosLat * Math.sin(lngRad),
    z: EARTH_RADIUS_METERS * Math.sin(latRad),
  };
};

export const distanceToSegmentMeters = (point: LatLng, start: LatLng, end: LatLng): number => {
  if (start.latitude === end.latitude && start.longitude === end.longitude) {
    return haversineDistanceMeters(point, start);
  }

  const p = toCartesian(point);
  const a = toCartesian(start);
  const b = toCartesian(end);

  const ab = {x: b.x - a.x, y: b.y - a.y, z: b.z - a.z};
  const ap = {x: p.x - a.x, y: p.y - a.y, z: p.z - a.z};

  const abLengthSquared = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
  const dot = ap.x * ab.x + ap.y * ab.y + ap.z * ab.z;
  const t = Math.max(0, Math.min(1, dot / abLengthSquared));

  const closest = {x: a.x + ab.x * t, y: a.y + ab.y * t, z: a.z + ab.z * t};
  const distanceVector = {x: p.x - closest.x, y: p.y - closest.y, z: p.z - closest.z};
  const distance = Math.sqrt(
    distanceVector.x * distanceVector.x +
      distanceVector.y * distanceVector.y +
      distanceVector.z * distanceVector.z,
  );

  return distance;
};

export const bearingBetweenPoints = (start: LatLng, end: LatLng): number => {
  const startLat = toRadians(start.latitude);
  const startLng = toRadians(start.longitude);
  const endLat = toRadians(end.latitude);
  const endLng = toRadians(end.longitude);

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  const bearing = Math.atan2(y, x);
  const bearingDegrees = (bearing * 180) / Math.PI;
  return (bearingDegrees + 360) % 360;
};





