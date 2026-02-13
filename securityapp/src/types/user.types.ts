export interface SecurityOfficer {
  id: number; // Backend User.id (numeric)
  security_id: string; // Security officer ID (string)
  name: string | undefined;
  email_id: string;
  mobile: string;
  security_role: 'guard' | 'supervisor' | 'admin';
  geofence_id: string;
  user_image?: string;
  status: 'active' | 'inactive';
  badge_number?: string;
  shift_schedule?: string;
  stats?: OfficerStats;
  // Additional properties that may come from API responses
  officer_geofence?: string;
  geofence_name?: string;
  assigned_geofence?: {
    id?: string | number;
    name?: string;
  };
  // Additional fields from backend
  date_joined?: string;
  last_login?: string;
}

export interface OfficerStats {
  total_responses: number;
  avg_response_time: number; // in minutes
  active_hours: number;
  area_coverage: number; // in km²
  rating?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
  devicetoken?: string;
  device_type: 'android' | 'ios';
}

// Django REST API Login Response Format
export interface DjangoLoginResponse {
  access: string; // JWT access token
  refresh: string; // JWT refresh token
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    mobile?: string;
    geofence_id?: string;
    user_image?: string;
    status?: string;
  };
}

// Legacy format (for backward compatibility)
export interface LoginResponse {
  result: 'success' | 'failed';
  role: 'security' | 'user';
  security_id?: string;
  name?: string;
  email_id?: string;
  mobile?: string;
  security_role?: string;
  geofence_id?: string;
  user_image?: string;
  status?: string;
  msg?: string;
  // Django format fields
  access?: string;
  refresh?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    mobile?: string;
    geofence_id?: string;
    user_image?: string;
    status?: string;
  };
}