// Stub hook for alerts functionality - returns dummy functions only
export const useAlerts = () => {
  return {
    acceptAlert: (alertId: string) => Promise.resolve(),
    rejectAlert: (alertId: string) => Promise.resolve(),
    updateAlertStatus: (alertId: string, status: string) => Promise.resolve(),
    refreshAlerts: () => Promise.resolve(),
  };
};