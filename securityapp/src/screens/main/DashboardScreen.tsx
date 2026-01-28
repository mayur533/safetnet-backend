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
import { colors } from '../../utils/colors';
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
    updateAlert: storeUpdateAlert
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

  // Fetch dashboard data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🏠 Dashboard: Screen focused, fetching dashboard data...');
      fetchDashboardData();
      // Recent alerts are now included in the dashboard API response
    }, [])
  );

  // Test network connectivity
  const testNetworkConnectivity = async () => {
    try {
      console.log('Testing network connectivity to Render...');
      // Try to reach Render's general endpoint (not our API)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        await fetch('https://safetnet.onrender.com/', {
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log('Network test successful');
        return true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (networkError) {
      console.error('Network connectivity test failed:', networkError);
      return false;
    }
  };


  const handleRespond = async (alert: Alert) => {
    RNAlert.alert(
      'Respond to Alert',
      `Accept and respond to alert from ${alert.user_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              console.log('📞 Accepting alert response from Dashboard:', alert.id);
              await storeUpdateAlert(alert.id, { status: 'accepted' });
              console.log('✅ Alert accepted successfully from Dashboard');
              RNAlert.alert('Success', 'Alert accepted! Check the Alerts page for more actions.');
            } catch (error) {
              console.error('❌ Failed to accept alert from Dashboard:', error);
              RNAlert.alert('Error', 'Failed to accept alert. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSettingsPress = () => {
    (navigation as any).navigate('Settings');
  };

    // Calculate stats from dashboard API data - no fallback dummy data
  const stats = dashboardData?.stats || null;

  // Get recent alerts from alertsStore instead of dashboard API
  const recentAlerts = getRecentAlerts(5);

  // Show loading state
  if (isLoadingDashboard) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7 }]}>
          Fetching dashboard data from SafeTNet backend
        </Text>
      </View>
    );
  }

  // Show error state - no dummy data fallback
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
          <TouchableOpacity
            style={[styles.retryButton, styles.secondaryButton]}
            onPress={() => {
              console.log('Opening troubleshooting guide...');
              console.log('1. Check browser: https://safetnet.onrender.com');
              console.log('2. Check Render dashboard for service status');
              console.log('3. Wait 30-60 seconds for backend to wake up');
              console.log('4. Check device network connection');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Troubleshoot</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>
          If issues persist, check the console logs for detailed error information.
        </Text>
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
              <Text style={styles.statValue}>{stats.active_sos_alerts}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.pendingValue]}>{stats.assigned_cases}</Text>
              <Text style={styles.statLabel}>Cases</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.resolvedValue]}>{stats.resolved_today}</Text>
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
                  // Navigate to Alerts screen
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
              // Show exactly 5 recent alerts from API
              recentAlerts.map((alert) => {
                console.log('🔑 Dashboard AlertCard key:', alert.id, alert.message?.substring(0, 30));
                return (
                  <AlertCard key={String(alert.id)} alert={alert} onRespond={handleRespond} />
                );
              })
            ) : (
              // Show empty state message instead of dummy placeholders
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayBg,
  },
  header: {
    backgroundColor: colors.white,
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
  menuIcon: {
    fontSize: 24,
    color: colors.darkText,
  },
  title: {
    ...typography.screenHeader,
    color: colors.darkText,
  },
  bellIcon: {
    fontSize: 24,
    color: colors.darkText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  statsSection: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  statsCard: {
    backgroundColor: colors.white,
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
    color: colors.warningOrange,
  },
  resolvedValue: {
    color: colors.successGreen,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
  sectionIcon: {
    fontSize: 24,
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
    backgroundColor: colors.lightGrayBg,
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
  emptyCard: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 12,
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
    fontSize: 13,
    color: colors.lightText,
    textAlign: 'center',
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
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  helpText: {
    ...typography.caption,
    color: colors.mediumText,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
  emptyAlertCard: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  emptyCardContent: {
    flexDirection: 'row',
    flex: 1,
  },
  emptyCardLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: colors.border,
  },
  emptyCardBody: {
    flex: 1,
    paddingLeft: 4,
  },
  emptyBadge: {
    alignSelf: 'flex-start',
    height: 20,
    width: 80,
    backgroundColor: colors.border,
    borderRadius: 10,
    marginBottom: 8,
  },
  emptyContent: {
    flex: 1,
  },
  emptyAlertTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emptyIconPlaceholder: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
    marginRight: 6,
  },
  emptyTextPlaceholder: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
  },
  emptyBadgePlaceholder: {
    width: 50,
    height: 18,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginLeft: 8,
  },
  emptyTextPlaceholderLarge: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginBottom: 4,
    width: '80%',
  },
  emptyTextPlaceholderMedium: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginBottom: 6,
    width: '60%',
  },
  emptyTextPlaceholderSmall: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginBottom: 2,
    width: '40%',
  },
  emptyCardActions: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyButtonPlaceholder: {
    flex: 1,
    height: 44,
    backgroundColor: colors.border,
    borderRadius: 8,
    marginRight: 12,
  },
  // Empty state styles (replaces dummy placeholders)
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

// Export with bottom nav wrapper
