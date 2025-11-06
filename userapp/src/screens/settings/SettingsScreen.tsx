import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, Switch} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSettingsStore} from '../../stores/settingsStore';
import {shakeDetectionService} from '../../services/shakeDetectionService';

const SettingsScreen = () => {
  const shakeToSendSOS = useSettingsStore((state) => state.shakeToSendSOS);
  const setShakeToSendSOS = useSettingsStore((state) => state.setShakeToSendSOS);
  const [isAccelerometerAvailable, setIsAccelerometerAvailable] = useState(false);

  useEffect(() => {
    // Check if accelerometer is available immediately
    const checkAvailability = () => {
      const available = shakeDetectionService.isAccelerometerAvailable();
      setIsAccelerometerAvailable(available);
      return available;
    };

    // Initial check
    checkAvailability();

    // Retry checking after a delay in case module loads later
    const retryInterval = setInterval(() => {
      if (checkAvailability()) {
        clearInterval(retryInterval); // Stop retrying once available
      }
    }, 2000); // Check every 2 seconds

    // Stop retrying after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(retryInterval);
    }, 10000);

    return () => {
      clearInterval(retryInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="vibration" size={24} color="#2563EB" />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Send SOS by shaking phone 3 times</Text>
              <Text style={styles.settingDescription}>
                Enable shake gesture to quickly send SOS alerts
              </Text>
              {!isAccelerometerAvailable && (
                <Text style={styles.warningText}>
                  Accelerometer not available. Please rebuild the app.
                </Text>
              )}
            </View>
          </View>
          <Switch
            value={shakeToSendSOS && isAccelerometerAvailable}
            onValueChange={async (value) => {
              if (isAccelerometerAvailable) {
                await setShakeToSendSOS(value);
                // Start/stop service based on setting
                if (value) {
                  shakeDetectionService.start(() => {
                    // This will be handled by HomeScreen
                  });
                } else {
                  shakeDetectionService.stop();
                }
              }
            }}
            disabled={!isAccelerometerAvailable}
            trackColor={{false: '#D1D5DB', true: '#93C5FD'}}
            thumbColor={shakeToSendSOS && isAccelerometerAvailable ? '#2563EB' : '#F3F4F6'}
            ios_backgroundColor="#D1D5DB"
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  section: {
    marginTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default SettingsScreen;

