// Stub hook for location functionality - returns dummy data only
export const useLocation = () => {
  return {
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
    getCurrentLocation: () => Promise.resolve(),
    error: null,
  };
};