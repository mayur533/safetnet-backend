import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
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

const AddMemberScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark || false;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const {groupId, groupName} = (route.params as any) || {};

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [geofenceOnly, setGeofenceOnly] = useState(true);
  const [includeOtherGeofences, setIncludeOtherGeofences] = useState(false);
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'error' | 'success' | 'info' | 'warning',
  });

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.id) {
        loadAvailableUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, geofenceOnly, includeOtherGeofences, user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadAvailableUsers(true);
    }
  }, [user?.id]);

  const loadAvailableUsers = useCallback(
    async (isInitial = false) => {
      if (!user?.id || !groupId) return;

      try {
        if (isInitial) {
          setInitialLoading(true);
        } else {
          setUsersLoading(true);
        }

        const groupIdNum = parseInt(groupId, 10);
        const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        // Get current group members to exclude them
        const groupDetails = await apiService.getChatGroupDetails(userIdNum, groupIdNum);
        const currentMemberIds = (groupDetails.members || []).map((m: any) => m.id);

        const users = await apiService.getAvailableUsers({
          geofenceOnly,
          includeOtherGeofences,
          search: searchQuery,
        });

        // Filter out users who are already members
        const filteredUsers = users.filter((u: User) => !currentMemberIds.includes(u.id));

        setAvailableUsers(filteredUsers);
      } catch (error: any) {
        console.error('Error loading available users:', error);
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
    },
    [geofenceOnly, includeOtherGeofences, searchQuery, user?.id, groupId]
  );

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      setAlertState({
        visible: true,
        title: 'No Selection',
        message: 'Please select at least one user to add.',
        type: 'warning',
      });
      return;
    }

    if (!user?.id || !groupId) return;

    setAdding(true);
    try {
      const groupIdNum = parseInt(groupId, 10);
      const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      await apiService.addGroupMembers(userIdNum, groupIdNum, selectedUsers);

      const successMessage = `${selectedUsers.length} member(s) added successfully`;
      if (Platform.OS === 'android') {
        ToastAndroid.show(successMessage, ToastAndroid.LONG);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error adding members:', error);
      setAlertState({
        visible: true,
        title: 'Error',
        message: error?.message || 'Failed to add members. Please try again.',
        type: 'error',
      });
    } finally {
      setAdding(false);
    }
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

  if (initialLoading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border}]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, {color: colors.text}]}>Add Members</Text>
          {groupName && (
            <Text style={[styles.headerSubtitle, {color: colors.text, opacity: 0.7}]}>
              {groupName}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: selectedUsers.length > 0 ? colors.primary : colors.border,
              opacity: selectedUsers.length > 0 ? 1 : 0.5,
            },
          ]}
          onPress={handleAddMembers}
          activeOpacity={0.7}
          disabled={selectedUsers.length === 0 || adding}>
          {adding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add ({selectedUsers.length})</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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

        {/* Users List */}
        <View style={styles.usersListContainer}>
          <FlatList
            data={availableUsers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserItem}
            scrollEnabled={false}
            style={[styles.usersList, usersLoading && styles.usersListLoading]}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="person-off" size={48} color={colors.text} style={{opacity: 0.6}} />
                <Text style={[styles.emptyText, {color: colors.text, opacity: 0.7}]}>
                  {searchQuery
                    ? 'No users found matching your search criteria.'
                    : 'No available users to add to the group.'}
                </Text>
              </View>
            )}
          />
          {usersLoading && (
            <View style={[styles.usersLoadingOverlay, {backgroundColor: colors.background}]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.usersLoadingText, {color: colors.text, opacity: 0.7}]}>
                Loading users...
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ThemedAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState({...alertState, visible: false})}
      />
    </View>
  );
};

const createStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: 8,
      width: 40,
    },
    headerTitleContainer: {
      flex: 1,
      marginLeft: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    headerSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    addButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    filterOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    filterOptionText: {
      fontSize: 13,
      fontWeight: '500',
    },
    usersListContainer: {
      position: 'relative',
    },
    usersList: {
      marginBottom: 16,
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
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    usersLoadingText: {
      marginTop: 8,
      fontSize: 14,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
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
      marginBottom: 2,
    },
    userEmail: {
      fontSize: 13,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },
  });

export default AddMemberScreen;

