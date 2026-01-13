import { LoginResponse } from '../types/user.types';
import { Alert } from '../types/alert.types';

// Mock officer credentials database
export const MOCK_OFFICERS = {
  // Badge ID: BADGE001
  BADGE001: {
    password: 'officer123',
    officer: {
      security_id: 'SEC001',
      name: 'John Smith',
      email_id: 'john.smith@safetnet.com',
      mobile: '+1234567890',
      security_role: 'guard' as const,
      geofence_id: 'GEO001',
      user_image: undefined,
      status: 'active' as const,
      badge_number: 'BADGE001',
      shift_schedule: 'Day Shift',
      geofence_name: 'Main Building',
      stats: {
        total_responses: 47,
        avg_response_time: 3.2, // in minutes
        active_hours: 168, // hours this week
      },
    },
  },
  // Email: officer@safetnet.com
  'officer@safetnet.com': {
    password: 'securepass456',
    officer: {
      security_id: 'SEC002',
      name: 'Sarah Johnson',
      email_id: 'officer@safetnet.com',
      mobile: '+1234567891',
      security_role: 'supervisor' as const,
      geofence_id: 'GEO002',
      user_image: undefined,
      status: 'active' as const,
      badge_number: 'BADGE002',
      shift_schedule: 'Night Shift',
      geofence_name: 'Parking Area',
      stats: {
        total_responses: 89,
        avg_response_time: 2.8, // in minutes
        active_hours: 192, // hours this week
      },
    },
  },
};

// Mock login function
export const mockLogin = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Normalize email/badge ID (case insensitive)
  const normalizedKey = email.trim().toUpperCase();

  // Try to find officer by badge ID or email
  const officerData =
    MOCK_OFFICERS[normalizedKey as keyof typeof MOCK_OFFICERS] ||
    MOCK_OFFICERS[email.toLowerCase() as keyof typeof MOCK_OFFICERS];

  if (!officerData) {
    return {
      result: 'failed',
      role: 'security',
      msg: 'Invalid badge ID or email',
    };
  }

  if (officerData.password !== password) {
    return {
      result: 'failed',
      role: 'security',
      msg: 'Invalid password',
    };
  }

  // Success response
  return {
    result: 'success',
    role: 'security',
    security_id: officerData.officer.security_id,
    name: officerData.officer.name,
    email_id: officerData.officer.email_id,
    mobile: officerData.officer.mobile,
    security_role: officerData.officer.security_role,
    geofence_id: officerData.officer.geofence_id,
    user_image: officerData.officer.user_image,
    status: officerData.officer.status,
  };
};

// Mock alert data
export const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert_001',
    log_id: 'log_001',
    user_id: 'user_001',
    user_name: 'Alice Johnson',
    user_email: 'alice.johnson@email.com',
    user_phone: '+1234567890',
    alert_type: 'emergency',
    original_alert_type: 'emergency',
    priority: 'high',
    message: 'Medical emergency - person collapsed in lobby',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Main Street, Downtown San Francisco',
    },
    distance: 0.5,
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    status: 'pending',
    geofence_id: 'GEO001',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert_002',
    log_id: 'log_002',
    user_id: 'user_002',
    user_name: 'Bob Wilson',
    user_email: 'bob.wilson@email.com',
    user_phone: '+1234567891',
    alert_type: 'security',
    original_alert_type: 'warning',
    priority: 'medium',
    message: 'Suspicious person loitering near entrance',
    location: {
      latitude: 37.7849,
      longitude: -122.4094,
      address: '456 Oak Avenue, Mission District',
    },
    distance: 1.2,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    status: 'accepted',
    geofence_id: 'GEO001',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'alert_003',
    log_id: 'log_003',
    user_id: 'user_003',
    user_name: 'Carol Davis',
    user_email: 'carol.davis@email.com',
    user_phone: '+1234567892',
    alert_type: 'normal',
    original_alert_type: 'general',
    priority: 'low',
    message: 'Maintenance request - elevator out of service',
    location: {
      latitude: 37.7649,
      longitude: -122.4294,
      address: '789 Pine Street, Richmond District',
    },
    distance: 2.1,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    status: 'completed',
    geofence_id: 'GEO001',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];