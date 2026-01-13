// Stub service for geofence functionality - returns dummy data only
export const geofenceService = {
  getGeofences: () => Promise.resolve([]),
  getGeofenceById: (id: string) => Promise.resolve(null),
  getGeofenceDetails: (id: string) => Promise.resolve({ geofence_id: id, name: 'Geofence Area', radius: 100 }),
  createGeofence: (data: any) => Promise.resolve({ id: 'geo_001' }),
  updateGeofence: (id: string, data: any) => Promise.resolve({}),
  deleteGeofence: (id: string) => Promise.resolve(true),
};