export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface GeofenceArea {
  geofence_id: string;
  name: string;
  description?: string;
  coordinates: Location[];
  center: Location;
  radius?: number; // in meters
  active_users_count?: number;
  area_size?: number; // in km²
}