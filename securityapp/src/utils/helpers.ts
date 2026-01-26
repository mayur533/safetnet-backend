/**
 * Format timestamp to relative time (e.g., "2m ago", "1h ago")
 */
export const formatRelativeTime = (timestamp: string | Date): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return diffMins <= 1 ? '1m ago' : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
  } else {
    return diffDays === 1 ? '1d ago' : `${diffDays}d ago`;
  }
};

/**
 * Format timestamp to exact date and time (e.g., "Dec 22, 2025 11:30 AM")
 */
export const formatExactTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

/**
 * Format timestamp to exact time only (e.g., "11:30 AM")
 */
export const formatExactTimeOnly = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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