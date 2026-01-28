import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { alertService } from '../../api/services/alertService';
import { Alert } from '../../types/alert.types';

export const DebugAlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string>('');

  // Direct API call without any store
  const fetchDirectAlerts = async () => {
    setLoading(true);
    try {
      console.log('🔍 DEBUG: Direct API call to fetch alerts...');
      const freshAlerts = await alertService.getAlerts();
      console.log(`🔍 DEBUG: Got ${freshAlerts.length} alerts directly from API`);
      
      setAlerts(freshAlerts);
      setLastFetch(new Date().toISOString());
      
      // Log the first few alerts
      freshAlerts.slice(0, 3).forEach((alert, index) => {
        console.log(`🔍 DEBUG Alert ${index + 1}: ID=${alert.id}, Message="${alert.message?.substring(0, 30)}...", Created=${alert.created_at}`);
      });
    } catch (error) {
      console.error('🔍 DEBUG: Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create test alert
  const createTestAlert = async () => {
    try {
      console.log('🔍 DEBUG: Creating test alert...');
      const newAlert = await alertService.createAlert({
        alert_type: 'security',
        message: `Debug test alert - ${Date.now()}`,
        description: 'This is a debug test alert',
        latitude: 18.5204,
        longitude: 73.8567
      });
      
      console.log(`🔍 DEBUG: Created alert ID=${newAlert.id}`);
      
      // Immediately fetch alerts to see if it appears
      setTimeout(() => {
        fetchDirectAlerts();
      }, 1000);
      
    } catch (error) {
      console.error('🔍 DEBUG: Error creating alert:', error);
    }
  };

  useEffect(() => {
    fetchDirectAlerts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DEBUG ALERTS SCREEN</Text>
      <Text style={styles.subtitle}>Direct API calls (no store)</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Fetch Fresh Alerts" onPress={fetchDirectAlerts} />
        <Button title="Create Test Alert" onPress={createTestAlert} />
      </View>
      
      <Text style={styles.info}>
        Last Fetch: {lastFetch || 'Never'}
      </Text>
      <Text style={styles.info}>
        Alerts Count: {alerts.length}
      </Text>
      
      {loading && <Text>Loading...</Text>}
      
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.alertItem}>
            <Text style={styles.alertText}>
              {index + 1}. ID:{item.id} - {item.message?.substring(0, 40)}...
            </Text>
            <Text style={styles.alertSubtext}>
              Status: {item.status} | Created: {item.created_at}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 14, color: 'gray', marginBottom: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  info: { fontSize: 12, color: 'blue', marginBottom: 10 },
  alertItem: { 
    backgroundColor: '#f5f5f5', 
    padding: 10, 
    marginBottom: 5, 
    borderRadius: 5 
  },
  alertText: { fontSize: 14, fontWeight: 'bold' },
  alertSubtext: { fontSize: 12, color: 'gray' }
});
