// Stub service for location functionality - returns dummy data only
export const locationService = {
  getCurrentLocation: () => Promise.resolve({
    latitude: 37.7749,
    longitude: -122.4194,
  }),
  calculateDistance: (from: any, to: any) => 0,
  geocodeAddress: (address: string) => Promise.resolve({
    latitude: 37.7749,
    longitude: -122.4194,
  }),
};