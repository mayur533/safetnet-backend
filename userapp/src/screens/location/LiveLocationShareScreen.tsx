import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAuthStore} from '../../stores/authStore';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {apiService} from '../../services/apiService';

const FREE_TIER_LIMITS = {
  MAX_LIVE_SHARE_MINUTES: 30,
};

const LiveLocationShareScreen = () => {
  const theme = useTheme();
  const {colors} = theme;
  const insets = useSafeAreaInsets();
  const isDarkMode = theme.dark || false;
  const user = useAuthStore((state) => state.user);
  const {isPremium, requirePremium} = useSubscription();

  const [duration, setDuration] = useState('30');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (!user?.id) return;
    try {
      setRefreshing(true);
      const response = await apiService.getLiveLocationSessions(Number(user.id));
      if (response.sessions) {
        setSessions(response.sessions);
      }
    } catch (error: any) {
      console.error('Error loading sessions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStartSharing = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const durationMinutes = parseInt(duration, 10);
    if (isNaN(durationMinutes) || durationMinutes < 1) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    // Check free tier limit
    if (!isPremium && durationMinutes > FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES) {
      requirePremium(
        `Free plan allows up to ${FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES} minutes of live sharing. Upgrade to Premium for unlimited sharing.`
      );
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.startLiveLocationShare(
        Number(user.id),
        durationMinutes
      );
      Alert.alert('Success', 'Live location sharing started');
      loadSessions();
      setDuration('30');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start live sharing');
    } finally {
      setLoading(false);
    }
  };

  const maxDuration = isPremium ? 1440 : FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          padding: 16,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
        header: {
          marginBottom: 24,
        },
        title: {
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 8,
        },
        subtitle: {
          fontSize: 16,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : '#6B7280',
        },
        card: {
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        cardTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 12,
        },
        inputContainer: {
          marginBottom: 16,
        },
        label: {
          fontSize: 14,
          fontWeight: '500',
          color: colors.text,
          marginBottom: 8,
        },
        input: {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F9FAFB',
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#E5E7EB',
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: colors.text,
        },
        limitText: {
          fontSize: 12,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF',
          marginTop: 4,
        },
        startButton: {
          backgroundColor: colors.primary,
          borderRadius: 8,
          padding: 16,
          alignItems: 'center',
          marginTop: 8,
        },
        startButtonDisabled: {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
        },
        startButtonText: {
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
        },
        startButtonTextDisabled: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#9CA3AF',
        },
        sessionsTitle: {
          fontSize: 20,
          fontWeight: '600',
          color: colors.text,
          marginTop: 24,
          marginBottom: 16,
        },
        sessionCard: {
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
        },
        sessionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        },
        sessionStatus: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.primary,
        },
        sessionTime: {
          fontSize: 12,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF',
        },
        premiumBadge: {
          backgroundColor: '#F59E0B',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          marginTop: 8,
        },
        premiumBadgeText: {
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '600',
        },
        emptyState: {
          alignItems: 'center',
          padding: 32,
        },
        emptyIcon: {
          marginBottom: 16,
        },
        emptyText: {
          fontSize: 16,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF',
          textAlign: 'center',
        },
      }),
    [colors, isDarkMode, insets]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <ActivityIndicator
            animating={refreshing}
            color={colors.primary}
            size="small"
          />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Live Location Sharing</Text>
          <Text style={styles.subtitle}>
            Share your real-time location with trusted contacts
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start Sharing</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="Enter duration"
              placeholderTextColor={isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#9CA3AF'}
            />
            <Text style={styles.limitText}>
              {isPremium
                ? 'Premium: Unlimited duration'
                : `Free: Up to ${FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES} minutes`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.startButton, loading && styles.startButtonDisabled]}
            onPress={handleStartSharing}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.startButtonText}>Start Sharing</Text>
            )}
          </TouchableOpacity>
          {!isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>
                Upgrade to Premium for unlimited sharing
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sessionsTitle}>Active Sessions</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="location-off"
              size={48}
              color={isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#D1D5DB'}
            />
            <Text style={styles.emptyText}>No active sharing sessions</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionStatus}>
                  {session.is_active ? 'Active' : 'Expired'}
                </Text>
                <Text style={styles.sessionTime}>
                  Expires: {new Date(session.expires_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default LiveLocationShareScreen;

