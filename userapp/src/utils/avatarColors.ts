/**
 * Utility to generate consistent avatar colors for users
 * Users with the same initials get different background colors
 */

const AVATAR_COLORS = [
  '#2563EB', // Blue
  '#DC2626', // Red
  '#059669', // Green
  '#D97706', // Orange
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#CA8A04', // Yellow
  '#EA580C', // Orange Red
  '#BE185D', // Rose
  '#0369A1', // Sky Blue
  '#16A34A', // Emerald
];

/**
 * Get avatar color for a user based on their name
 * Users with the same initials will get different colors
 */
export const getAvatarColor = (firstName: string, lastName: string, userId: number): string => {
  // Create a unique identifier from name and user ID
  const identifier = `${firstName}${lastName}${userId}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get color index
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
};

/**
 * Get initials from first and last name
 */
export const getInitials = (firstName: string, lastName: string): string => {
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${lastInitial}` || '?';
};


