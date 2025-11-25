import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Platform,
  ToastAndroid,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';
import {ThemedAlert} from '../../components/common/ThemedAlert';
import {getInitials, getAvatarColor} from '../../utils/avatarColors';

interface User {
  id: number;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const CreateGroupScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark || false;
  const user = useAuthStore((state) => state.user);
  const {onGroupCreated} = (route.params as any) || {};

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geofenceOnly, setGeofenceOnly] = useState(true);
  const [includeOtherGeofences, setIncludeOtherGeofences] = useState(false);
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'error' | 'success' | 'info' | 'warning',
  });

  // Initial load
  useEffect(() => {
    loadAvailableUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle filter changes (only after initial load)
  useEffect(() => {
    if (initialLoading) return;
    loadAvailableUsers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofenceOnly, includeOtherGeofences, initialLoading]);

  // Debounce search (only after initial load)
  useEffect(() => {
    if (initialLoading) return;
    const timer = setTimeout(() => {
      loadAvailableUsers(false);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, initialLoading]);

  const loadAvailableUsers = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setUsersLoading(true);
      }
      const users = await apiService.getAvailableUsers({
        geofenceOnly,
        includeOtherGeofences,
        search: searchQuery,
      });
      setAvailableUsers(users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setAlertState({
        visible: true,
        title: 'Error',
        message: 'Failed to load users. Please try again.',
        type: 'error',
      });
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      } else {
        setUsersLoading(false);
      }
    }
  }, [geofenceOnly, includeOtherGeofences, searchQuery]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setAlertState({
        visible: true,
        title: 'Error',
        message: 'Please enter a group name',
        type: 'error',
      });
      return;
    }

    if (selectedUsers.length === 0) {
      setAlertState({
        visible: true,
        title: 'Error',
        message: 'Please select at least one member',
        type: 'error',
      });
      return;
    }

    if (!user?.id) {
      setAlertState({
        visible: true,
        title: 'Error',
        message: 'User not found. Please login again.',
        type: 'error',
      });
      return;
    }

    try {
      setCreating(true);
      const group = await apiService.createChatGroup(user.id, {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        member_ids: selectedUsers,
      });

      // Show success toast
      const successMessage = `Group "${group.name}" created successfully!`;
      if (Platform.OS === 'android') {
        ToastAndroid.show(successMessage, ToastAndroid.LONG);
      } else {
        // For iOS, we'll use the alert as fallback
        setAlertState({
          visible: true,
          title: 'Success',
          message: successMessage,
          type: 'success',
        });
      }

      // Call callback if provided
      if (onGroupCreated) {
        onGroupCreated({
          id: group.id.toString(),
          name: group.name,
          description: group.description,
          memberCount: group.member_count || selectedUsers.length + 1,
          isUnread: false,
        });
      }

      // Navigate to Community screen instead of going back
      // Navigate directly to Community - the focus listener will refresh groups
      navigation.navigate('Community');
    } catch (error: any) {
      console.error('Error creating group:', error);
      setAlertState({
        visible: true,
        title: 'Error',
        message: error?.message || 'Failed to create group. Please try again.',
        type: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const renderUserItem = ({item}: {item: User}) => {
    const isSelected = selectedUsers.includes(item.id);
    const firstName = item.first_name || '';
    const lastName = item.last_name || '';
    const initials = getInitials(firstName, lastName);
    const avatarColor = getAvatarColor(firstName, lastName, item.id);

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          {
            backgroundColor: isSelected
              ? isDarkMode
                ? 'rgba(37, 99, 235, 0.2)'
                : '#EFF6FF'
              : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => toggleUserSelection(item.id)}
        activeOpacity={0.7}>
        <View style={[styles.userAvatar, {backgroundColor: avatarColor}]}>
          <Text style={styles.userAvatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, {color: colors.text}]}>{item.name}</Text>
          <Text style={[styles.userEmail, {color: colors.text, opacity: 0.7}]}>{item.email}</Text>
        </View>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.card}
      />
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Create New Group</Text>
        <View style={styles.headerRight} />
      </View>

      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Text style={[styles.label, {color: colors.text}]}>Group Name *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Enter group name"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholderTextColor={isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF'}
            />

            <Text style={[styles.label, {color: colors.text}]}>Description (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Enter group description"
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor={isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF'}
            />

            <Text style={[styles.label, {color: colors.text}]}>Members *</Text>
            <Text style={[styles.memberCountText, {color: colors.text, opacity: 0.7}]}>
              {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
            </Text>

            {/* Search Bar */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F9FAFB',
                  borderColor: colors.border,
                },
              ]}>
              <MaterialIcons name="search" size={20} color={colors.text} style={{opacity: 0.5}} />
              <TextInput
                style={[styles.searchInput, {color: colors.text}]}
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF'}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.7}>
                  <MaterialIcons name="clear" size={20} color={colors.text} style={{opacity: 0.5}} />
                </TouchableOpacity>
              )}
            </View>

            {/* Geofence Filter Options */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: geofenceOnly
                      ? colors.primary
                      : isDarkMode
                      ? 'rgba(255, 255, 255, 0.05)'
                      : '#F9FAFB',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setGeofenceOnly(true);
                  setIncludeOtherGeofences(false);
                }}
                activeOpacity={0.7}>
                <MaterialIcons
                  name={geofenceOnly ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={geofenceOnly ? '#FFFFFF' : colors.text}
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: geofenceOnly ? '#FFFFFF' : colors.text,
                    },
                  ]}>
                  Same Geofences Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: includeOtherGeofences
                      ? colors.primary
                      : isDarkMode
                      ? 'rgba(255, 255, 255, 0.05)'
                      : '#F9FAFB',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setGeofenceOnly(false);
                  setIncludeOtherGeofences(true);
                }}
                activeOpacity={0.7}>
                <MaterialIcons
                  name={includeOtherGeofences ? 'check-circle' : 'radio-button-unchecked'}
                  size={20}
                  color={includeOtherGeofences ? '#FFFFFF' : colors.text}
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: includeOtherGeofences ? '#FFFFFF' : colors.text,
                    },
                  ]}>
                  Include Other Geofences
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.usersListContainer}>
              {usersLoading && (
                <View style={styles.usersLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.usersLoadingText, {color: colors.text, opacity: 0.7}]}>
                    Loading users...
                  </Text>
                </View>
              )}
              <FlatList
                data={availableUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                scrollEnabled={false}
                style={[styles.usersList, usersLoading && styles.usersListLoading]}
                ListEmptyComponent={
                  !usersLoading ? (
                    <View style={styles.emptyContainer}>
                      <MaterialIcons name="people-outline" size={48} color={colors.text} style={{opacity: 0.3}} />
                      <Text style={[styles.emptyText, {color: colors.text, opacity: 0.6}]}>
                        {searchQuery
                          ? 'No users found matching your search'
                          : 'No users available'}
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  backgroundColor:
                    !newGroupName.trim() || selectedUsers.length === 0 || creating
                      ? isDarkMode
                        ? 'rgba(255, 255, 255, 0.1)'
                        : '#D1D5DB'
                      : colors.primary,
                },
              ]}
              onPress={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedUsers.length === 0 || creating}
              activeOpacity={0.7}>
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.createButtonText,
                    {
                      color:
                        !newGroupName.trim() || selectedUsers.length === 0 || creating
                          ? isDarkMode
                            ? 'rgba(255, 255, 255, 0.5)'
                            : '#9CA3AF'
                          : '#FFFFFF',
                    },
                  ]}>
                  Create Group
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <ThemedAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={[{text: 'OK', onPress: () => setAlertState({...alertState, visible: false})}]}
        onDismiss={() => setAlertState({...alertState, visible: false})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  memberCountText: {
    fontSize: 14,
    marginBottom: 12,
  },
  usersListContainer: {
    marginBottom: 20,
    position: 'relative',
    minHeight: 100,
  },
  usersList: {
    opacity: 1,
  },
  usersListLoading: {
    opacity: 0.5,
  },
  usersLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 8,
  },
  usersLoadingText: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  filterContainer: {
    marginBottom: 16,
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CreateGroupScreen;
