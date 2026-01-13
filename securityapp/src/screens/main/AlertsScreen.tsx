import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AlertCard } from '../../components/alerts/AlertCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Alert } from '../../types/alert.types';
import { alertService } from '../../api/services/alertService';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

export const AlertsScreen = () => {
  const navigation = useNavigation();
  const colors = useColors();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch alerts on component mount with retry logic
  useEffect(() => {
    fetchAlertsWithRetry();
  }, []);

  // Aggressive retry logic to fetch real data
  const fetchAlertsWithRetry = async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    try {
      await fetchAlerts();
    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`Alerts fetch failed (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          fetchAlertsWithRetry(retryCount + 1);
        }, retryDelay);
      } else {
        console.log('All retry attempts failed, showing empty state');
        // No fallback data - show empty alerts list
        setAlerts([]);
        setError('Unable to load alerts. Backend connection failed. Alerts list will be empty.');
        setLoading(false);
      }
    }
  };

  const fetchAlerts = async () => {
    try {
      setError(null);
      const alertsData = await alertService.getAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to load alerts');
      // Could show a toast or fallback to mock data here if needed
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAlerts();
    } catch (error) {
      console.error('Error refreshing alerts:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRespond = (alert: Alert) => {
    RNAlert.alert(
      'Respond to Alert',
      `Respond to alert from ${alert.user_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            // Navigate to alerts map to show locations
            (navigation as any).navigate('AlertsMap', { alert });
          },
        },
      ]
    );
  };

  const handleDelete = (alert: Alert) => {
    RNAlert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAlerts(prevAlerts => prevAlerts.filter(a => a.id !== alert.id));
            RNAlert.alert('Success', 'Alert deleted successfully!');
          },
        },
      ]
    );
  };

  const handleSolve = (alert: Alert) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(a =>
        a.id === alert.id ? { ...a, status: 'completed' as const } : a
      )
    );
    RNAlert.alert('Success', 'Alert marked as solved!');
  };

  const renderAlertItem = ({ item }: { item: Alert }) => (
    <AlertCard
      alert={item}
      onRespond={handleRespond}
      onDelete={handleDelete}
      onSolve={handleSolve}
    />
  );

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.darkText }]}>Loading alerts...</Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7, color: colors.darkText }]}>
          Connecting to SafeTNet backend
        </Text>
      </View>
    );
  }

  // Show error state
  if (error && alerts.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <Icon name="error" size={48} color={colors.emergencyRed} />
        <Text style={[styles.errorText, { color: colors.emergencyRed }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => fetchAlertsWithRetry()}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.lightGrayBg }]}>
      <View style={[styles.header, {
        backgroundColor: colors.white,
        borderBottomColor: colors.borderGray
      }]}>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Alerts</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => {}}>
          <Icon name="filter-list" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {alerts.length > 0 ? (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="notifications-off"
            title="No Alerts"
            description="All quiet on the security front!"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.screenHeader,
  },
  filterButton: {
    padding: spacing.sm,
  },
  listContainer: {
    padding: spacing.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.buttonSmall,
    fontWeight: '600',
  },
});

