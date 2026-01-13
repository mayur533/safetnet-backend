// Stub utility for permissions - returns dummy success only
export const requestLocationPermission = () => Promise.resolve(true);

export const requestLocationPermissionWithCheck = () => Promise.resolve({
  granted: true,
  canAskAgain: true,
});