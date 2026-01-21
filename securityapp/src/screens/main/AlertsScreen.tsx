import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  ScrollView,
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'emergency' | 'pending' | 'accepted' | 'completed'>('all');

  // Fetch alerts on component mount with retry logic
  useEffect(() => {
    fetchAlertsWithRetry();
  }, []);

  // Reset filter to 'all' when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setSelectedFilter('all');
    }, [])
  );

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

  // Filter alerts based on selected section
  const getFilteredAlerts = () => {
    if (selectedFilter === 'all') return alerts;
    if (selectedFilter === 'emergency') return alerts.filter(alert => alert.alert_type === 'emergency' || alert.priority === 'high');
    if (selectedFilter === 'pending') return alerts.filter(alert => alert.status === 'pending' || !alert.status);
    if (selectedFilter === 'accepted') return alerts.filter(alert => alert.status === 'accepted');
    if (selectedFilter === 'completed') return alerts.filter(alert => alert.status === 'completed');
    return alerts;
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
        shadowColor: colors.darkText,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
              <Icon name="notifications" size={20} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.darkText }]}>Security Alerts</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mediumText }]}>Monitor and respond</Text>
            </View>
          </View>
          <View style={styles.headerStats}>
            <View style={[styles.statBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.statText, { color: colors.white }]}>{alerts.length}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Sections - Horizontal Scrollable */}
      <View style={[styles.filterSection, {
        backgroundColor: colors.white,
        shadowColor: colors.darkText
      }]}>
        <View style={styles.filterHeader}>
          <Icon name="filter-list" size={16} color={colors.mediumText} />
          <Text style={[styles.filterTitle, { color: colors.mediumText }]}>Filter by Status</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.filterContainer}
        >
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'all' ? colors.primary : 'rgba(37, 99, 235, 0.1)',
            borderColor: selectedFilter === 'all' ? colors.primary : 'rgba(37, 99, 235, 0.2)'
          }]}
          onPress={() => setSelectedFilter('all')}
        >
          <Icon name="list" size={16} color={selectedFilter === 'all' ? colors.white : colors.primary} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'all' ? colors.white : colors.primary }]}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'emergency' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'emergency' ? colors.emergencyRed : 'rgba(220, 38, 38, 0.1)',
            borderColor: selectedFilter === 'emergency' ? colors.emergencyRed : 'rgba(220, 38, 38, 0.2)'
          }]}
          onPress={() => setSelectedFilter('emergency')}
        >
          <Icon name="warning" size={16} color={selectedFilter === 'emergency' ? colors.white : colors.emergencyRed} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'emergency' ? colors.white : colors.emergencyRed }]}>Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'pending' ? colors.warningOrange : 'rgba(249, 115, 22, 0.1)',
            borderColor: selectedFilter === 'pending' ? colors.warningOrange : 'rgba(249, 115, 22, 0.2)'
          }]}
          onPress={() => setSelectedFilter('pending')}
        >
          <Icon name="schedule" size={16} color={selectedFilter === 'pending' ? colors.white : colors.warningOrange} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'pending' ? colors.white : colors.warningOrange }]}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'accepted' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'accepted' ? colors.successGreen : 'rgba(16, 185, 129, 0.1)',
            borderColor: selectedFilter === 'accepted' ? colors.successGreen : 'rgba(16, 185, 129, 0.2)'
          }]}
          onPress={() => setSelectedFilter('accepted')}
        >
          <Icon name="check-circle" size={16} color={selectedFilter === 'accepted' ? colors.white : colors.successGreen} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'accepted' ? colors.white : colors.successGreen }]}>Accepted</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'completed' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'completed' ? colors.primary : 'rgba(37, 99, 235, 0.1)',
            borderColor: selectedFilter === 'completed' ? colors.primary : 'rgba(37, 99, 235, 0.2)'
          }]}
          onPress={() => setSelectedFilter('completed')}
        >
          <Icon name="done-all" size={16} color={selectedFilter === 'completed' ? colors.white : colors.primary} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'completed' ? colors.white : colors.primary }]}>Completed</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>

      {getFilteredAlerts().length > 0 ? (
        <FlatList
          data={getFilteredAlerts()}
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
            title={alerts.length === 0 ? "No Alerts" : `No ${selectedFilter === 'all' ? 'Alerts' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Alerts`}
            description={
              alerts.length === 0
                ? "All quiet on the security front!"
                : `No alerts match the "${selectedFilter === 'all' ? 'All Alerts' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}" filter.`
            }
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.screenHeader,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    opacity: 0.7,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
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
  filterSection: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.base,
    borderRadius: 12,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  filterTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  filterText: {
    ...typography.caption,
    fontWeight: '500',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
  },
  filterIcon: {
    marginRight: 6,
  },
});

