export interface Geofence {
  id: string;
  name: string;
  description?: string;
  center_latitude: number;
  center_longitude: number;
  radius?: number;
  polygon_json?: string;
  geofence_type: 'circle' | 'polygon';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface Alert {
  id: number; // Backend returns integer IDs
  log_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_image?: string;
  alert_type: 'emergency' | 'normal' | 'security';
  original_alert_type?: 'general' | 'warning' | 'emergency';
  priority: 'high' | 'medium' | 'low';
  message: string;
  description?: string; // Optional description field
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  location_lat: number;
  location_long: number;
  distance?: number;
  timestamp: string;
  status: 'pending' | 'accepted' | 'completed' | 'resolved' | 'cancelled';
  geofence_id: string;
  geofence?: Geofence; // Optional full geofence object
  created_at: string;
  updated_at?: string;
}

export interface AlertResponse {
  result: 'success' | 'failed';
  data: Alert[];
  message?: string;
}

export interface AcceptAlertPayload {
  log_id: string;
  security_id: string;
  estimated_arrival?: number;
}

export interface BroadcastAlertPayload {
  security_id: string;
  geofence_id: string;
  message: string;
  alert_type: 'general' | 'warning' | 'emergency';
  priority: boolean;
}