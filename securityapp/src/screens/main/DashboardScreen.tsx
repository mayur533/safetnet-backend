import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  LogBox,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AlertCard } from '../../components/alerts/AlertCard';
import { Alert } from '../../types/alert.types';
import { alertService } from '../../api/services/alertService';
import { dashboardService, DashboardData, DashboardStats } from '../../api/services/dashboardService';
import { useAlertsStore } from '../../store/alertsStore';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

// Suppress debugger-related warnings that appear on login
LogBox.ignoreLogs([
  'Remote debugger',
  'Debugger and device',
  'Open debugger',
  'debugger',
]);

// Suppress console warnings related to debugger
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('Remote debugger') ||
    message.includes('Debugger and device') ||
    message.includes('Open debugger') ||
    message.includes('debugger')
  ) {
    return; // Suppress debugger warnings
  }
  originalWarn.apply(console, args); // Show other warnings
};

export const DashboardScreen = () => {
  const navigation = useNavigation();
  const colors = useColors();

  // State for dashboard data from API
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Use Zustand alerts store (kept for alert actions)
  const {
    alerts,
    isLoading: isLoadingAlerts,
    error: alertsError,
    fetchAlerts,
    getRecentAlerts,
    getPendingAlertsCount,
    getResolvedAlertsCount,
  } = useAlertsStore();

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setIsLoadingDashboard(true);
      setDashboardError(null);
      console.log('🏠 Dashboard: Fetching dashboard data from API...');
      const data = await dashboardService.getDashboardData();
      setDashboardData(data);
      console.log('✅ Dashboard: Data fetched successfully');
    } catch (error: any) {
      console.error('❌ Dashboard: Failed to fetch data:', error);
      setDashboardError(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    console.log('🏠 Dashboard: Component mounted, doing initial fetch...');
    
    const fetchInitialData = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Dashboard fetch timeout')), 10000)
        );
        
        await Promise.race([
          Promise.all([
            fetchDashboardData(),
            fetchAlerts()
          ]),
          timeoutPromise
        ]);
        
        console.log('✅ Dashboard: Initial data fetch completed');
      } catch (error) {
        console.error('❌ Dashboard: Initial data fetch failed:', error);
      }
    };
    
    fetchInitialData();
  }, []);

  const handleRespond = async (alert: Alert) => {
    console.log('📞 Dashboard: Navigate to respond page for alert:', alert.id);
    (navigation as any).navigate('AlertRespondMap', { alertId: String(alert.id) });
  };

  const handleSettingsPress = () => {
    (navigation as any).navigate('Settings');
  };

  // Calculate stats from dashboard API data
  const stats = dashboardData?.stats || null;

  // Get recent alerts from alertsStore
  const recentAlerts = getRecentAlerts(5);
  const pendingAlertsCount = getPendingAlertsCount();
  const resolvedAlertsCount = getResolvedAlertsCount();
  
  // CRITICAL: Log exact counts for debugging
  console.log('🔍 CRITICAL DEBUG - Dashboard Analysis:');
  console.log(`   📊 Total alerts in store: ${alerts.length}`);
  console.log(`   📊 Recent alerts shown: ${recentAlerts.length}`);
  console.log(`   📊 Pending alerts count: ${pendingAlertsCount}`);
  console.log(`   📊 Resolved alerts count: ${resolvedAlertsCount}`);
  console.log(`   📊 Dashboard stats - Active (frontend): ${alerts.length}, Resolved (backend): ${stats?.resolved_today}`);
  
  if (recentAlerts.length > 0) {
    const newestAlertId = recentAlerts[0]?.id;
    const newestAlertMessage = recentAlerts[0]?.message?.substring(0, 40);
    console.log(`   📋 Newest alert: ID:${newestAlertId} "${newestAlertMessage}..."`);
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...typography.body,
      color: colors.darkText,
      marginTop: spacing.md,
    },
    errorTitle: {
      ...typography.screenHeader,
      color: colors.emergencyRed,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    errorText: {
      ...typography.body,
      color: colors.mediumText,
      textAlign: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 8,
    },
    retryButtonText: {
      ...typography.buttonSmall,
      color: colors.white,
      fontWeight: '600',
    },
    errorActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    header: {
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...typography.sectionHeader,
      color: colors.darkText,
      fontSize: 20,
      fontWeight: 'bold',
    },
    settingsButton: {
      padding: spacing.xs,
    },
    headerSpacer: {
      width: 40,
    },
    scrollContent: {
      paddingBottom: spacing.lg,
    },
    statsSection: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
    },
    statsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: -0.5,
      marginBottom: spacing.xs,
    },
    pendingValue: {
      color: colors.warning,
    },
    resolvedValue: {
      color: colors.success,
    },
    statLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.lightText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    section: {
      marginTop: spacing.lg,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionHeaderContainer: {
      backgroundColor: colors.cardBackground,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    alertsIconContainer: {
      backgroundColor: '#FEE2E2',
    },
    sectionTitle: {
      ...typography.sectionHeader,
      fontSize: 18,
      fontWeight: '700',
      color: colors.darkText,
      marginBottom: 2,
    },
    sectionSubtitle: {
      ...typography.caption,
      fontSize: 12,
      color: colors.lightText,
      fontWeight: '400',
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      backgroundColor: colors.background,
    },
    seeAllText: {
      ...typography.buttonSmall,
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
      marginRight: 4,
    },
    seeAllArrow: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
    cardsContainer: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    emptyStateTitle: {
      ...typography.sectionHeader,
      fontSize: 18,
      fontWeight: '600',
      color: colors.lightText,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptyStateText: {
      ...typography.body,
      fontSize: 14,
      color: colors.mediumText,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  // Show loading state
  if (isLoadingDashboard) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7 }]}>
          Fetching dashboard data and alerts from SafeTNet backend
        </Text>
      </View>
    );
  }

  // Show error state
  if (dashboardError || !stats) {
    const isNetworkError = dashboardError?.includes('SSL connection') || dashboardError?.includes('Network Error') || dashboardError?.includes('timeout') || dashboardError?.includes('ECONNREFUSED');
    const errorTitle = isNetworkError ? 'Backend Server Unavailable' : 'Error Loading Dashboard';
    const errorMessage = isNetworkError
      ? 'SafeTNet backend server is currently unavailable.\n\nPlease ensure the Django server is running on the correct port.'
      : dashboardError || 'Failed to load dashboard data from server';

    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name={isNetworkError ? 'wifi-off' : 'error'} size={48} color={colors.emergencyRed} />
        <Text style={styles.errorTitle}>{errorTitle}</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              console.log('🔄 Retrying dashboard load...');
              fetchDashboardData();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
          activeOpacity={0.7}
        >
          <Icon name="settings" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.pendingValue]}>{getPendingAlertsCount()}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.resolvedValue]}>{resolvedAlertsCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      </View>

      {/* Recent Alerts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.iconContainer, styles.alertsIconContainer]}>
                <Icon name="notifications" size={24} color={colors.emergencyRed} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Recent Alerts</Text>
                <Text style={styles.sectionSubtitle}>
                  {recentAlerts.length > 0 ? `${recentAlerts.length} most recent` : 'No recent alerts'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => {
                (navigation as any).navigate('Alerts');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Text style={styles.seeAllArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.cardsContainer}>
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert) => {
              console.log('🔑 Dashboard AlertCard key:', alert.id, alert.message?.substring(0, 30));
              return (
                <AlertCard key={String(alert.id)} alert={alert} onRespond={handleRespond} />
              );
            })
          ) : (
            <View style={styles.emptyStateContainer}>
              <Icon name="notifications-none" size={48} color={colors.lightText} />
              <Text style={styles.emptyStateTitle}>No Recent Alerts</Text>
              <Text style={styles.emptyStateText}>
                When alerts are received, they will appear here
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
