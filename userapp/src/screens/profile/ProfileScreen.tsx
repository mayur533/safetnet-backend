import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '@react-navigation/native';
import {useNavigation} from '@react-navigation/native';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';
import {useSubscription} from '../../lib/hooks/useSubscription';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {colors} = theme;
  const isDarkMode = theme.dark || false;
  const {isPremium} = useSubscription();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  });

  // Theme-aware colors
  const themeColors = useMemo(
    () => ({
      background: colors.background,
      card: colors.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
      text: colors.text || (isDarkMode ? '#F1F5F9' : '#0F172A'),
      textMuted: isDarkMode ? 'rgba(241, 245, 249, 0.7)' : '#64748B',
      border: colors.border || (isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0'),
      primary: colors.primary || '#2563EB',
      primaryLight: isDarkMode ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
      error: '#DC2626',
      errorLight: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEF2F2',
      success: '#10B981',
      successLight: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
    }),
    [colors, isDarkMode],
  );

  const styles = useMemo(() => createStyles(themeColors, insets), [themeColors, insets]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();
      if (response.data) {
        setProfileData(response.data);
        setEditForm({
          name: response.data.name || user?.name || '',
          phone: response.data.phone || user?.phone || '',
        });
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    await refreshProfile();
    setRefreshing(false);
  };

  const handleEdit = () => {
    setEditForm({
      name: profileData?.name || user?.name || '',
      phone: profileData?.phone || user?.phone || '',
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    try {
      setUpdating(true);
      const response = await apiService.updateProfile({
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
      });

      if (response.data || response.message) {
        await loadProfile();
        await refreshProfile();
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  const quickActions = [
    {
      id: 'family',
      label: 'Family Contacts',
      icon: 'family-restroom',
      screen: 'Family',
      color: '#7C3AED',
      bgColor: isDarkMode ? 'rgba(124, 58, 237, 0.2)' : '#F5F3FF',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: 'notifications',
      screen: 'Alert',
      color: '#EF4444',
      bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
    },
    {
      id: 'community',
      label: 'Community',
      icon: 'groups',
      screen: 'Community',
      color: '#B91C1C',
      bgColor: isDarkMode ? 'rgba(185, 28, 28, 0.2)' : '#FEF2F2',
    },
    {
      id: 'geofence',
      label: 'Geofencing',
      icon: 'fence',
      screen: 'GeofenceArea',
      color: '#047857',
      bgColor: isDarkMode ? 'rgba(4, 120, 87, 0.2)' : '#ECFDF5',
      premium: true,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: 'payment',
      screen: 'Billing',
      color: '#F59E0B',
      bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      screen: 'Settings',
      color: '#6B7280',
      bgColor: isDarkMode ? 'rgba(107, 114, 128, 0.2)' : '#F9FAFB',
    },
  ];

  const handleQuickAction = (action: typeof quickActions[0]) => {
    if (action.premium && !isPremium) {
      Alert.alert('Premium Feature', 'This feature is available for Premium users only.', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Upgrade', onPress: () => navigation.navigate('Billing')},
      ]);
      return;
    }
    navigation.navigate(action.screen);
  };

  const displayData = profileData || user;
  const displayName = displayData?.name || 'User';
  const displayEmail = displayData?.email || user?.email || '';
  const displayPhone = displayData?.phone || user?.phone || 'Not provided';
  const displayPlan = displayData?.plantype || user?.plan || 'free';
  const planExpiry = displayData?.planexpiry;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, {color: themeColors.textMuted}]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}>
      {/* Header Section */}
      <View style={[styles.header, {backgroundColor: themeColors.primary}]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, {backgroundColor: themeColors.card}]}>
            <Text style={[styles.avatarText, {color: themeColors.primary}]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <MaterialIcons name="workspace-premium" size={16} color="#FBBF24" />
            </View>
          )}
        </View>
        <Text style={styles.headerName}>{displayName}</Text>
        <Text style={styles.headerEmail}>{displayEmail}</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, {backgroundColor: themeColors.success}]} />
          <Text style={styles.statusText}>
            {displayPlan === 'premium' ? 'Premium Member' : 'Free Member'}
          </Text>
        </View>
        {planExpiry && displayPlan === 'premium' && (
          <Text style={styles.expiryText}>
            Expires: {new Date(planExpiry).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: themeColors.text}]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: action.bgColor,
                  borderColor: themeColors.border,
                },
                action.premium && !isPremium && styles.quickActionDisabled,
              ]}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.7}>
              <View style={[styles.quickActionIcon, {backgroundColor: action.color}]}>
                <MaterialIcons name={action.icon as any} size={24} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.quickActionLabel,
                  {color: themeColors.text},
                  action.premium && !isPremium && {color: themeColors.textMuted},
                ]}>
                {action.label}
              </Text>
              {action.premium && (
                <View style={styles.premiumIndicator}>
                  <MaterialIcons name="workspace-premium" size={12} color="#FBBF24" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <View style={[styles.card, {backgroundColor: themeColors.card, borderColor: themeColors.border}]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, {color: themeColors.text}]}>Profile Information</Text>
            <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={20} color={themeColors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.infoRow, {borderBottomColor: themeColors.border}]}>
            <Text style={[styles.infoLabel, {color: themeColors.textMuted}]}>Full Name</Text>
            <Text style={[styles.infoValue, {color: themeColors.text}]}>{displayName}</Text>
          </View>

          <View style={[styles.infoRow, {borderBottomColor: themeColors.border}]}>
            <Text style={[styles.infoLabel, {color: themeColors.textMuted}]}>Email</Text>
            <Text style={[styles.infoValue, {color: themeColors.text}]}>{displayEmail}</Text>
          </View>

          <View style={[styles.infoRow, {borderBottomColor: themeColors.border}]}>
            <Text style={[styles.infoLabel, {color: themeColors.textMuted}]}>Phone</Text>
            <Text style={[styles.infoValue, {color: themeColors.text}]}>{displayPhone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, {color: themeColors.textMuted}]}>Plan</Text>
            <View style={styles.planBadge}>
              <Text
                style={[
                  styles.planText,
                  {
                    color: displayPlan === 'premium' ? '#FBBF24' : themeColors.text,
                    backgroundColor:
                      displayPlan === 'premium'
                        ? (isDarkMode ? 'rgba(251, 191, 36, 0.2)' : '#FEF3C7')
                        : themeColors.primaryLight,
                  },
                ]}>
                {displayPlan === 'premium' ? 'Premium' : 'Free'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            {
              backgroundColor: themeColors.errorLight,
              borderColor: themeColors.error,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <MaterialIcons name="logout" size={20} color={themeColors.error} />
          <Text style={[styles.logoutText, {color: themeColors.error}]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: themeColors.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: themeColors.text}]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, {color: themeColors.textMuted}]}>Full Name</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F9FAFB',
                    color: themeColors.text,
                    borderColor: themeColors.border,
                  },
                ]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter your name"
                placeholderTextColor={themeColors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, {color: themeColors.textMuted}]}>Phone</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F9FAFB',
                    color: themeColors.text,
                    borderColor: themeColors.border,
                  },
                ]}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({...editForm, phone: text})}
                placeholder="Enter your phone number"
                placeholderTextColor={themeColors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, {borderColor: themeColors.border}]}
                onPress={() => setEditModalVisible(false)}
                disabled={updating}>
                <Text style={[styles.modalButtonText, {color: themeColors.textMuted}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, {backgroundColor: themeColors.primary}]}
                onPress={handleUpdate}
                disabled={updating}>
                {updating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (themeColors: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    header: {
      paddingTop: insets.top + 16,
      paddingBottom: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    avatarText: {
      fontSize: 36,
      fontWeight: 'bold',
    },
    premiumBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 4,
    },
    headerName: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    headerEmail: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
      marginBottom: 8,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    statusText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 12,
      textTransform: 'capitalize',
    },
    expiryText: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 11,
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 24,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickActionCard: {
      width: '30%',
      aspectRatio: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      position: 'relative',
    },
    quickActionDisabled: {
      opacity: 0.6,
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    quickActionLabel: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    premiumIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    card: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    infoRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    infoLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    planBadge: {
      alignSelf: 'flex-start',
    },
    planText: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: insets.bottom + 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 14,
      marginBottom: 8,
    },
    formInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonCancel: {
      borderWidth: 1,
    },
    modalButtonSave: {},
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonTextSave: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default ProfileScreen;
