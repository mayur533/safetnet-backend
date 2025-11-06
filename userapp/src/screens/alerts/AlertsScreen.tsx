import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {mockAlerts} from '../../services/mockData';
import {format} from 'date-fns';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  location?: {lat: number; lng: number};
}

const AlertsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    setRefreshing(false);
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          iconBg: '#EF4444',
          text: '#991B1B',
          icon: '#FFFFFF',
        };
      case 'geofence':
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          iconBg: '#2563EB',
          text: '#1E40AF',
          icon: '#FFFFFF',
        };
      case 'report':
        return {
          bg: '#FEFCE8',
          border: '#FDE047',
          iconBg: '#EAB308',
          text: '#854D0E',
          icon: '#FFFFFF',
        };
      default:
        return {
          bg: '#F9FAFB',
          border: '#E5E7EB',
          iconBg: '#6B7280',
          text: '#374151',
          icon: '#FFFFFF',
        };
    }
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
    const colors = getAlertColor(alert.type);

    return (
      <View
        key={alert.id}
        style={[
          styles.alertCard,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderLeftWidth: !alert.read ? 4 : 1,
          },
        ]}>
        <View style={styles.alertHeader}>
          <View style={[styles.iconContainer, {backgroundColor: colors.iconBg}]}>
            <MaterialIcons name={getAlertIcon(alert.type)} size={20} color={colors.icon} />
          </View>
          <View style={styles.alertContent}>
            <View style={styles.alertTitleRow}>
              <Text style={[styles.alertTitle, {color: colors.text}]} numberOfLines={1}>
                {alert.title}
              </Text>
              {!alert.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={[styles.alertMessage, {color: colors.text}]} numberOfLines={2}>
              {alert.message}
            </Text>
            <Text style={styles.alertTime}>{formatTimeAgo(alert.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {mockAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="notifications-none" size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>No alerts yet</Text>
          <Text style={styles.emptyStateSubtext}>You'll see alerts here when they're sent</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={true}>
          {mockAlerts.map((alert) => renderAlert(alert))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  alertCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  alertTime: {
    fontSize: 11,
    color: '#9CA3AF',
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
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AlertsScreen;
