import moment from 'moment';

/**
 * Format timestamp to relative time (e.g., "2m ago", "1h ago")
 */
export const formatRelativeTime = (timestamp: string | Date): string => {
  return moment(timestamp).fromNow();
};

/**
 * Format timestamp to exact date and time (e.g., "Dec 22, 2025 11:30 AM")
 */
export const formatExactTime = (timestamp: string | Date): string => {
  return moment(timestamp).format('MMM DD, YYYY hh:mm A');
};

/**
 * Format timestamp to exact time only (e.g., "11:30 AM")
 */
export const formatExactTimeOnly = (timestamp: string | Date): string => {
  return moment(timestamp).format('hh:mm A');
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in miles
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Get alert type color
 */
export const getAlertTypeColor = (type: string): string => {
  switch (type) {
    case 'emergency':
      return '#DC2626';
    case 'normal':
      return '#3B82F6';
    case 'security':
      return '#F97316';
    default:
      return '#94A3B8';
  }
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point - The point to check { latitude, longitude }
 * @param polygon - Array of polygon vertices [{ latitude, longitude }, ...]
 * @returns true if point is inside polygon, false otherwise
 */
export const isPointInPolygon = (
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>
): boolean => {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  let inside = false;
  const { latitude: lat, longitude: lng } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};