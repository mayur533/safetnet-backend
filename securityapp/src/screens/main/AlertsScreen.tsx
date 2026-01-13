import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AlertCard } from '../../components/alerts/AlertCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Alert } from '../../types/alert.types';
import { MOCK_ALERTS } from '../../utils/mockData';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

export const AlertsScreen = () => {
  const colors = useColors();
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
            // Update alert status to accepted
            setAlerts(prevAlerts =>
              prevAlerts.map(a =>
                a.id === alert.id ? { ...a, status: 'accepted' as const } : a
              )
            );
            RNAlert.alert('Success', 'Alert response accepted!');
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
});

