import React, {useMemo, useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '@react-navigation/native';
import type {Theme} from '@react-navigation/native';
import {format} from 'date-fns';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';
import {sendAlertNotification} from '../../services/notificationService';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  location?: {lat: number; lng: number};
}

const withAlpha = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const expanded =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => char + char)
          .join('')
      : sanitized;
  const bigint = parseInt(expanded, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type AlertThemeTokens = {
  borderColor: string;
  cardShadowColor: string;
  mutedTextColor: string;
  secondaryTextColor: string;
  iconMutedColor: string;
  emptyIconColor: string;
};

const AlertsScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark;
  const user = useAuthStore((state) => state.user);

  const themeTokens = useMemo<AlertThemeTokens>(() => ({
    borderColor: withAlpha(colors.border, isDarkMode ? 0.7 : 1),
    cardShadowColor: isDarkMode ? 'rgba(15, 23, 42, 0.45)' : '#000000',
    mutedTextColor: isDarkMode ? 'rgba(226, 232, 240, 0.75)' : '#6B7280',
    secondaryTextColor: isDarkMode ? 'rgba(148, 163, 184, 0.85)' : '#9CA3AF',
    iconMutedColor: isDarkMode ? 'rgba(203, 213, 225, 0.85)' : '#6B7280',
    emptyIconColor: isDarkMode ? withAlpha(colors.notification, 0.7) : '#9CA3AF',
  }), [colors, isDarkMode]);

  const styles = useMemo(() => createStyles(colors, themeTokens, isDarkMode), [colors, themeTokens, isDarkMode]);
  const {mutedTextColor, secondaryTextColor, iconMutedColor, emptyIconColor} = themeTokens;

  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousAlertsCount, setPreviousAlertsCount] = useState(0);

  // Fetch alerts from API
  useEffect(() => {
    loadAlerts();
  }, [user]);

  // Check for new alerts and send notifications
  useEffect(() => {
    if (alerts.length > previousAlertsCount && previousAlertsCount > 0) {
      // New alerts detected
      const newAlerts = alerts.slice(0, alerts.length - previousAlertsCount);
      newAlerts.forEach((alert) => {
        if (!alert.read) {
          sendAlertNotification(alert.title, alert.message, alert.id);
        }
      });
    }
    setPreviousAlertsCount(alerts.length);
  }, [alerts, previousAlertsCount]);

  const loadAlerts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const userId = parseInt(user.id);
      
      // Get both SOS events and community alerts
      const [sosEventsData, communityAlertsData] = await Promise.allSettled([
        apiService.getSOSEvents(userId).catch(() => []),
        apiService.getCommunityAlerts(userId).catch(() => []),
      ]);
      
      const sosEvents = sosEventsData.status === 'fulfilled' ? sosEventsData.value : [];
      const communityAlerts = communityAlertsData.status === 'fulfilled' ? communityAlertsData.value : [];
      
      // Transform SOS events to alerts format
      const sosAlerts: Alert[] = Array.isArray(sosEvents) 
        ? sosEvents.map((event: any, index: number) => ({
            id: `sos-${event.id?.toString() || index}`,
            type: 'emergency',
            title: 'SOS Alert',
            message: event.notes || 'Emergency SOS triggered',
            timestamp: event.triggered_at ? new Date(event.triggered_at) : (event.created_at ? new Date(event.created_at) : new Date()),
            read: false,
            location: event.location ? {
              lat: typeof event.location === 'object' ? (event.location.latitude || event.location.lat || event.location[1]) : undefined,
              lng: typeof event.location === 'object' ? (event.location.longitude || event.location.lng || event.location[0]) : undefined
            } : undefined,
          }))
        : [];
      
      // Transform community alerts to alerts format
      const communityAlertsFormatted: Alert[] = Array.isArray(communityAlerts)
        ? communityAlerts.map((alert: any, index: number) => ({
            id: `community-${alert.id?.toString() || index}`,
            type: 'geofence',
            title: 'Community Alert',
            message: alert.message || 'Community alert',
            timestamp: alert.sent_at ? new Date(alert.sent_at) : new Date(),
            read: false,
            location: alert.location ? {
              lat: typeof alert.location === 'object' ? (alert.location.latitude || alert.location.lat || alert.location[1]) : undefined,
              lng: typeof alert.location === 'object' ? (alert.location.longitude || alert.location.lng || alert.location[0]) : undefined
            } : undefined,
          }))
        : [];
      
      // Combine and sort by timestamp (newest first)
      const allAlerts = [...sosAlerts, ...communityAlertsFormatted].sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      setAlerts(allAlerts);
    } catch (error: any) {
      console.error('Failed to load alerts:', error);
      // Show empty state on error
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const getAlertPalette = (type: string) => {
    const baseAccent = (() => {
      switch (type) {
        case 'emergency':
          return '#EF4444';
        case 'geofence':
          return '#2563EB';
        case 'report':
          return '#EAB308';
        default:
          return colors.primary;
      }
    })();

    return {
      background: withAlpha(baseAccent, isDarkMode ? 0.24 : 0.12),
      border: withAlpha(baseAccent, isDarkMode ? 0.45 : 0.2),
      iconBackground: isDarkMode ? withAlpha(baseAccent, 0.65) : baseAccent,
      iconColor: '#FFFFFF',
      textColor: colors.text,
      dotColor: baseAccent,
    };
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'warning';
      case 'geofence':
        return 'location-on';
      case 'report':
        return 'description';
      default:
        return 'notifications';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return format(date, 'MMM d, yyyy');
  };

  const renderAlert = (alert: Alert) => {
    const palette = getAlertPalette(alert.type);

    return (
      <View
        key={alert.id}
        style={[
          styles.alertCard,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            borderLeftWidth: !alert.read ? 4 : 1,
          },
        ]}>
        <View style={styles.alertHeader}>
          <View style={[styles.iconContainer, {backgroundColor: palette.iconBackground}]}>
            <MaterialIcons name={getAlertIcon(alert.type)} size={20} color={palette.iconColor} />
          </View>
          <View style={styles.alertContent}>
            <View style={styles.alertTitleRow}>
              <Text style={[styles.alertTitle, {color: palette.textColor}]} numberOfLines={1}>
                {alert.title}
              </Text>
              {!alert.read && <View style={[styles.unreadDot, {backgroundColor: palette.dotColor}]} />}
            </View>
            <Text style={[styles.alertMessage, {color: palette.textColor}]} numberOfLines={2}>
              {alert.message}
            </Text>
            <Text style={styles.alertTime}>{formatTimeAgo(alert.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: mutedTextColor}]}>Loading alerts...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="notifications-none" size={64} color={emptyIconColor} />
          <Text style={styles.emptyStateText}>No alerts yet</Text>
          <Text style={styles.emptyStateSubtext}>You'll see alerts here when they're sent</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, {paddingBottom: 24 + insets.bottom}]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={true}>
          {alerts.map((alert) => renderAlert(alert))}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: Theme['colors'], tokens: AlertThemeTokens, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },
    alertCard: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      shadowColor: tokens.cardShadowColor,
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: isDarkMode ? 0.22 : 0.08,
      shadowRadius: isDarkMode ? 4 : 2,
      elevation: isDarkMode ? 4 : 2,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: tokens.iconMutedColor,
    },
    alertContent: {
      flex: 1,
    },
    alertTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    alertTitle: {
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
      marginRight: 8,
      color: colors.text,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    alertMessage: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 6,
      color: colors.text,
    },
    alertTime: {
      fontSize: 11,
      color: tokens.secondaryTextColor,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: tokens.mutedTextColor,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingText: {
      fontSize: 16,
      marginTop: 16,
    },
  });

export default AlertsScreen;
