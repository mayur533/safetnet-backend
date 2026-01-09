export interface Alert {
  id: string;
  log_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_image?: string;
  alert_type: 'emergency' | 'normal' | 'security';
  original_alert_type?: 'general' | 'warning' | 'emergency'; // Original type selected by user ('general' = General Notice)
  priority: 'high' | 'medium' | 'low';
  message: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance?: number; // in miles/km
  timestamp: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  geofence_id: string;
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
  estimated_arrival?: number; // in minutes
}

export interface BroadcastAlertPayload {
  security_id: string;
  geofence_id: string;
  message: string;
  alert_type: 'general' | 'warning' | 'emergency';
  priority: boolean;
}