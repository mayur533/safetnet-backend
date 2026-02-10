import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, TextInput, ScrollView, ActivityIndicator, Alert as RNAlert } from 'react-native';
import { AlertsScreen } from './AlertsScreen';

type AlertsScreenRef = React.RefObject<{
  fetchAlertsWithRetry: () => void;
}>;
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';
import { colors } from '../../utils/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, spacing } from '../../utils';
import { alertService } from '../../api/services/alertService';
import { useAlertsStore } from '../../store/alertsStore';

export const AlertsScreenWithBottomNav = ({ navigation }: any) => {

  // ALL useState hooks must be called first
  // Create alert modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [alertType, setAlertType] = useState<'emergency' | 'security' | 'general'>('security');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  // Toast message state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'waiting' | 'accurate' | 'weak' | 'error'>('waiting');
  const [gpsMessage, setGpsMessage] = useState('Getting device location...');
  const [lastAlertCoordinates, setLastAlertCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [lastStableLocation, setLastStableLocation] = useState<{latitude: number, longitude: number} | null>(null);

  // Other hooks can be called after all useState hooks
  const { createAlert: storeCreateAlert } = useAlertsStore();

  // Ref to access AlertsScreen methods
  const alertsScreenRef = useRef<{
    fetchAlertsWithRetry: () => void;
  }>(null);

  // Toast function
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 2000);
  };

  // Smooth GPS location to prevent jumping
  const smoothLocation = (newLocation: {latitude: number, longitude: number}): {latitude: number, longitude: number} => {
    if (!lastStableLocation) {
      setLastStableLocation(newLocation);
      return newLocation;
    }
    
    // Only update if moved significantly (more than 5 meters)
    const distance = calculateDistance(
      lastStableLocation.latitude,
      lastStableLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );
    
    if (distance > 5) {
      setLastStableLocation(newLocation);
      return newLocation;
    }
    
    // Return last stable location to prevent jumping
    return lastStableLocation;
  };
  
  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return distance in meters
  };

  // Get current device location when creating alert
  const getCurrentDeviceLocation = async (): Promise<{latitude: number, longitude: number}> => {
    return new Promise((resolve, reject) => {
      setGpsStatus('waiting');
      setGpsMessage('Getting device location...');

      console.log('📍 Getting REAL device location for alert...');
      
      // Use the proper geolocation package
      import('@react-native-community/geolocation').then((GeolocationModule) => {
        const Geolocation = GeolocationModule.default;
        
        if (!Geolocation || !Geolocation.getCurrentPosition) {
          console.log('❌ Geolocation package not available');
          setGpsStatus('error');
          setGpsMessage('Geolocation package not available');
          reject(new Error('Geolocation package not available'));
          return;
        }

        Geolocation.getCurrentPosition(
          (position: any) => {
            console.log('✅ REAL device location captured:', position);
            
            const { latitude, longitude, accuracy } = position.coords;
            const timestamp = new Date().toISOString();
            
            // Smooth location to prevent jumping
            const smoothedLocation = smoothLocation({ latitude, longitude });
            
            console.log('📱 REAL DEVICE LOCATION FOR ALERT:', smoothedLocation.latitude, smoothedLocation.longitude, accuracy, timestamp);
            console.log('🎯 Location smoothed to prevent jumping');
            
            setGpsStatus('accurate');
            setGpsMessage(`Stable location captured (±${accuracy?.toFixed(0) || 0}m)`);
            resolve(smoothedLocation);
          },
          (error: any) => {
            // Reduce console noise for common GPS timeouts
            if (error.code === 3) {
              console.log('⏰ GPS timeout - trying faster fallback options...');
            } else {
              console.error('❌ GPS error:', error);
            }
            
            let errorMessage = 'GPS not available';
            let shouldRetry = false;
            
            if (error.code === 3) {
              errorMessage = 'GPS taking too long, using faster options...';
              shouldRetry = true;
            } else if (error.code === 2) {
              errorMessage = 'GPS unavailable. Enable location services.';
            } else if (error.code === 1) {
              errorMessage = 'Location permission denied. Allow location access.';
            }
            
            setGpsStatus('waiting');
            setGpsMessage(errorMessage);
            
            // For timeout errors, try to get cached location as fallback
            if (shouldRetry) {
              console.log('⏰ GPS timeout, trying cached location as fallback...');
              
              // Try to get cached location with very short timeout
              Geolocation.getCurrentPosition(
                (position) => {
                  console.log('📍 Using cached GPS location as fallback');
                  const { latitude, longitude, accuracy } = position.coords;
                  
                  if (accuracy > 100) {
                    console.warn('⚠️ Cached GPS accuracy is poor:', accuracy, 'meters');
                    setGpsStatus('weak');
                    setGpsMessage(`Using cached location (accuracy: ${Math.round(accuracy)}m)`);
                  } else {
                    console.log('✅ Cached GPS accuracy acceptable:', accuracy, 'meters');
                    setGpsStatus('accurate');
                    setGpsMessage(`Using cached location (accuracy: ${Math.round(accuracy)}m)`);
                  }
                  
                  resolve({
                    latitude,
                    longitude
                  });
                },
                (fallbackError) => {
                  console.log('❌ No cached location available either');
                  setGpsStatus('weak');
                  setGpsMessage('GPS unavailable - alert will be created without location');
                  
                  // Resolve with default location to allow alert creation
                  resolve({
                    latitude: 0,  // Default coordinates - will be handled by backend
                    longitude: 0
                  });
                },
                {
                  enableHighAccuracy: false,  // Don't require high accuracy for fallback
                  timeout: 5000,              // Very short timeout for cached location
                  maximumAge: 300000          // Allow 5-minute old cached location
                }
              );
              return; // Don't reject yet, wait for fallback
            }
            
            // Final fallback - allow alert creation without GPS
            setGpsStatus('weak');
            setGpsMessage('GPS unavailable - alert will be created without location');
            
            // Resolve with default location to allow alert creation
            resolve({
              latitude: 0,  // Default coordinates - will be handled by backend
              longitude: 0
            });
          },
          {
            enableHighAccuracy: false,  // Start with lower accuracy for faster response
            timeout: 8000,              // 8 seconds for alert creation (much faster!)
            maximumAge: 30000          // Allow 30-second cache for faster response
          }
        );
      }).catch((error) => {
        console.error('❌ Failed to import geolocation package:', error);
        setGpsStatus('error');
        setGpsMessage('Geolocation package not installed');
        reject(new Error('Geolocation package not available'));
      });
    });
  };
  // Create new alert function
  const handleCreateAlert = async () => {
    if (!alertMessage.trim()) {
      showToast('Please enter an alert message', 'error');
      return;
    }

    console.log('🚀 Creating alert with device location...');
    console.log('📝 Alert data:', {
      alertType,
      alertMessage: alertMessage.trim(),
      alertDescription: alertDescription.trim() || alertMessage.trim(),
    });

    setCreatingAlert(true);
    try {
      // Get current device location when creating alert
      console.log('� Getting device location for alert...');
      const deviceLocation = await getCurrentDeviceLocation();
      
      console.log('✅ Device location captured:', deviceLocation);
      
      // Store coordinates to prevent duplicates
      setLastAlertCoordinates({ lat: deviceLocation.latitude, lng: deviceLocation.longitude });

      console.log('📡 Creating alert with device coordinates');
      console.log('📍 Location data for backend:', {
        location_lat: deviceLocation.latitude,
        location_long: deviceLocation.longitude
      });

      // Create alert with device location
      const createdAlert = await storeCreateAlert({
        alert_type: alertType,
        message: alertMessage.trim(),
        description: alertDescription.trim() || alertMessage.trim(),
      });

      console.log('🎯 Alert created with device location and stored permanently');
      console.log('   📍 Location stored:', deviceLocation.latitude, deviceLocation.longitude);
      console.log('   📱 Alerts page (full list - synced with backend)');
      console.log('   📊 Dashboard Recent Alerts (synced with backend)');
      console.log('   💾 Backend database (persists across app restarts)');

      // Reset form and GPS state
      setAlertMessage('');
      setAlertDescription('');
      setAlertType('security');
      setCreateModalVisible(false);
      setGpsStatus('waiting');
      setGpsMessage('Getting device location...');
      
      showToast('Alert created with device location!', 'success');
    } catch (error: any) {
      console.error('❌ ALERT CREATION FAILED:', error);
      
      if (error?.message?.includes('GPS') || error?.message?.includes('location') || error?.message?.includes('coordinates')) {
        showToast('Unable to get device location. Alert not created.', 'error');
        console.error('🚫 Location requirement failed - Alert creation blocked');
      } else {
        showToast('Failed to create alert. Please try again.', 'error');
        console.error('🚫 Other error during alert creation');
      }
    } finally {
      setCreatingAlert(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.lightGrayBg }]}>
      <AlertsScreen ref={alertsScreenRef} />
      <BottomTabNavigator />

      {/* Add Alert Button - Similar to Profile Page Logout Button */}
      <TouchableOpacity
        style={[styles.addAlertButton, { backgroundColor: colors.emergencyRed }]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name="add" size={20} color={colors.white} />
        <Text style={[styles.addAlertButtonText, { color: colors.white }]}>Add Alert</Text>
      </TouchableOpacity>

      {/* Create Alert Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>Create New Alert</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={colors.mediumText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Alert Type Selection */}
              <Text style={[styles.inputLabel, { color: colors.darkText }]}>Alert Type</Text>
              <View style={styles.alertTypeContainer}>
                {[
                  { key: 'emergency', label: 'Emergency', color: colors.emergencyRed, icon: 'warning' },
                  { key: 'security', label: 'Security', color: colors.warningOrange, icon: 'security' },
                  { key: 'general', label: 'General', color: colors.primary, icon: 'info' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.alertTypeButton,
                      {
                        backgroundColor: alertType === type.key ? type.color : colors.lightGrayBg,
                        borderColor: alertType === type.key ? type.color : colors.border,
                      }
                    ]}
                    onPress={() => setAlertType(type.key as any)}
                  >
                    <Icon
                      name={type.icon as any}
                      size={20}
                      color={alertType === type.key ? colors.white : type.color}
                      style={styles.alertTypeIcon}
                    />
                    <Text style={[
                      styles.alertTypeText,
                      { color: alertType === type.key ? colors.white : colors.darkText }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Alert Message Input */}
              <Text style={[styles.inputLabel, { color: colors.darkText }]}>Alert Message *</Text>
              <TextInput
                style={[styles.textInput, {
                  borderColor: colors.border,
                  backgroundColor: colors.lightGrayBg,
                  color: colors.darkText
                }]}
                placeholder="Enter alert message..."
                placeholderTextColor={colors.mediumText}
                value={alertMessage}
                onChangeText={setAlertMessage}
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              {/* Alert Description Input */}
              <Text style={[styles.inputLabel, { color: colors.darkText }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.descriptionInput, {
                  borderColor: colors.border,
                  backgroundColor: colors.lightGrayBg,
                  color: colors.darkText
                }]}
                placeholder="Additional details..."
                placeholderTextColor={colors.mediumText}
                value={alertDescription}
                onChangeText={setAlertDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </ScrollView>

            {/* GPS Status Indicator */}
            <View style={[
              styles.gpsStatusContainer,
              {
                backgroundColor: gpsStatus === 'accurate' ? colors.successGreen + '20' :
                                 gpsStatus === 'weak' ? colors.warningOrange + '20' :
                                 gpsStatus === 'error' ? colors.emergencyRed + '20' :
                                 colors.mediumText + '20',
                borderColor: gpsStatus === 'accurate' ? colors.successGreen :
                            gpsStatus === 'weak' ? colors.warningOrange :
                            gpsStatus === 'error' ? colors.emergencyRed :
                            colors.mediumText
              }
            ]}>
              <Icon 
                name="location-on" 
                size={16} 
                color={gpsStatus === 'accurate' ? colors.successGreen :
                       gpsStatus === 'weak' ? colors.warningOrange :
                       gpsStatus === 'error' ? colors.emergencyRed :
                       colors.mediumText}
              />
              <Text style={[
                styles.gpsStatusText,
                {
                  color: gpsStatus === 'accurate' ? colors.successGreen :
                         gpsStatus === 'weak' ? colors.warningOrange :
                         gpsStatus === 'error' ? colors.emergencyRed :
                         colors.mediumText
                }
              ]}>
                {gpsMessage}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setCreateModalVisible(false);
                  setGpsStatus('waiting');
                  setGpsMessage('Getting device location...');
                }}
                disabled={creatingAlert}
              >
                <Text style={[styles.modalButtonText, { color: colors.mediumText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  {
                    backgroundColor: creatingAlert ? colors.mediumText : (
                      alertType === 'emergency' ? colors.emergencyRed :
                      alertType === 'security' ? colors.warningOrange : colors.primary
                    )
                  }
                ]}
                onPress={handleCreateAlert}
                disabled={creatingAlert || !alertMessage.trim()}
              >
                {creatingAlert ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Icon name="send" size={18} color={colors.white} style={styles.buttonIcon} />
                    <Text style={[styles.modalButtonText, { color: colors.white }]}>Create Alert</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Message */}
      {toastVisible && (
        <View style={[
          styles.toastContainer,
          { backgroundColor: toastType === 'success' ? colors.successGreen : colors.emergencyRed }
        ]}>
          <Text style={styles.toastMessage}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative', // Allow absolute positioning of child elements
  },
  addAlertButton: {
    position: 'absolute',
    bottom: 70, // Position above bottom navigation (accounting for nav height ~60px + some padding)
    left: spacing.base,
    right: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emergencyRed,
    borderRadius: 12,
    padding: spacing.base,
    gap: spacing.sm,
    elevation: 10, // Higher elevation to appear above navigation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000, // Ensure it appears above navigation
  },
  addAlertButtonText: {
    ...typography.buttonMedium,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.screenHeader,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
    flex: 1,
  },
  inputLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  alertTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginHorizontal: 2,
    borderWidth: 2,
  },
  alertTypeIcon: {
    marginRight: spacing.xs,
  },
  alertTypeText: {
    ...typography.buttonSmall,
    fontWeight: '600',
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
    ...typography.body,
  },
  descriptionInput: {
    minHeight: 100,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    ...typography.buttonSmall,
    fontWeight: '600',
    fontSize: 14,
  },
  // GPS Status styles
  gpsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    gap: spacing.sm,
  },
  gpsStatusText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  // Toast styles
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: colors.successGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  toastMessage: {
    ...typography.buttonSmall,
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

