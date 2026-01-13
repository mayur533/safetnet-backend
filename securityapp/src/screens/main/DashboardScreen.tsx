import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AlertCard } from '../../components/alerts/AlertCard';
import { Alert } from '../../types/alert.types';
import { alertService, DashboardData } from '../../api/services/alertService';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
export const DashboardScreen = () => {
  const navigation = useNavigation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch alerts data from backend and derive dashboard stats
      console.log('Fetching alerts data for dashboard...');
      const alerts = await alertService.getAlerts();

      // alerts is now guaranteed to be an array from alertService
      console.log('Alerts data received:', alerts.length, 'alerts');

      // Calculate dashboard stats from alerts data
      const active = alerts.filter(alert => alert.status === 'pending' || alert.status === 'accepted').length;
      const pending = alerts.filter(alert => alert.status === 'pending').length;
      const resolved = alerts.filter(alert => alert.status === 'completed').length;

      // Get recent alerts (last 2 alerts, sorted by timestamp)
      const recentAlerts = alerts
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 2);

      const dashboardData = {
        stats: {
          active,
          pending,
          resolved,
          total: active + pending + resolved
        },
        recent_alerts: recentAlerts
      };

      console.log('Dashboard data calculated from alerts:', dashboardData);
      setDashboardData(dashboardData);

      // Since alertService now handles all errors gracefully,
      // we should always succeed here. But keep basic error handling just in case.
    } catch (error: any) {
      console.error('Unexpected error in dashboard data processing:', error);
      // This should rarely happen now that alertService handles errors
      setError('Unexpected error occurred. Please try again.');

      // Fallback to empty data
      setDashboardData({
        stats: { active: 0, pending: 0, resolved: 0, total: 0 },
        recent_alerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (alert: Alert) => {
    // Navigate to alerts map to show locations
    (navigation as any).navigate('AlertsMap', { alert });
  };

  const handleSettingsPress = () => {
    (navigation as any).navigate('Settings');
  };

  // Calculate stats from real data or fallback
  const stats = dashboardData?.stats || {
    active: 0,
    pending: 0,
    resolved: 0,
    total: 0
  };

  // Get recent alerts from real data or fallback to empty array
  const recentAlerts = dashboardData?.recent_alerts?.slice(0, 2) || []; // Show 2 recent alerts

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7 }]}>
          Fetching alerts data from SafeTNet backend
        </Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="error" size={48} color={colors.emergencyRed} />
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchDashboardData}
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
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.pendingValue]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.resolvedValue]}>{stats.resolved}</Text>
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
                    {recentAlerts.length > 0 ? `${recentAlerts.length} active` : '0 active'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => {
                  // Navigate to Alerts tab
                  (navigation as any).navigate('MainTabs', { screen: 'AlertsTab' });
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
              recentAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onRespond={handleRespond} />
              ))
            ) : (
              // Show empty alert card placeholders
              Array.from({ length: 2 }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.emptyAlertCard}>
                  <View style={styles.emptyCardContent}>
                    <View style={styles.emptyCardLeftAccent} />
                    <View style={styles.emptyCardBody}>
                      <View style={styles.emptyBadge} />
                      <View style={styles.emptyContent}>
                        <View style={styles.emptyAlertTypeRow}>
                          <View style={styles.emptyIconPlaceholder} />
                          <View style={styles.emptyTextPlaceholder} />
                          <View style={styles.emptyBadgePlaceholder} />
                        </View>
                        <View style={styles.emptyTextPlaceholderLarge} />
                        <View style={styles.emptyTextPlaceholderMedium} />
                        <View style={styles.emptyTextPlaceholderSmall} />
                        <View style={styles.emptyTextPlaceholderSmall} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.emptyCardActions}>
                    <View style={styles.emptyButtonPlaceholder} />
                  </View>
                </View>
              ))
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
  errorText: {
    ...typography.body,
    color: colors.emergencyRed,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
});

// Export with bottom nav wrapper
