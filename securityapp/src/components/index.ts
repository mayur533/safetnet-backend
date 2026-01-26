/**
 * Components Directory
 *
 * Migration Guide:
 * - Move all reusable UI components from reference project src/components/ here
 * - Create separate files for each component (Button, Card, Input, etc.)
 * - Export all components from this index file for easy importing
 *
 * Example structure:
 * export { default as CustomButton } from './CustomButton';
 * export { default as IncidentCard } from './IncidentCard';
 * export { default as UserAvatar } from './UserAvatar';
 */

// Common UI Components
export { Button } from './common/Button';
export { Card } from './common/Card';
export { Input } from './common/Input';
export { LoadingSpinner } from './common/LoadingSpinner';
export { EmptyState } from './common/EmptyState';

// Alert Components
export { AlertCard } from './alerts/AlertCard';