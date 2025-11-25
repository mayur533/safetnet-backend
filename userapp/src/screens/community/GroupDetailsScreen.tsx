import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Modal,
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

interface GroupMember {
  id: number;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
}

interface GroupDetails {
  id: number;
  name: string;
  description?: string;
  members: GroupMember[];
  created_at: string;
  created_by: number;
  admin_id?: number;
  is_admin?: boolean;
}

const GroupDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark || false;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const {groupId, groupName} = (route.params as any) || {};

  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'leave' | 'remove' | 'delete';
    memberId?: number;
    memberName?: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'error' | 'success' | 'info' | 'warning',
  });

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  useEffect(() => {
    if (user?.id && groupId) {
      loadGroupDetails();
    }
  }, [groupId, user?.id]);

  const loadGroupDetails = async () => {
    if (!user?.id || !groupId) return;
    try {
      setLoading(true);
      const groupIdNum = parseInt(groupId, 10);
      const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      const data = await apiService.getChatGroupDetails(userIdNum, groupIdNum);
      setGroupDetails({
        id: data.id,
        name: data.name,
        description: data.description,
        members: data.members || [],
        created_at: data.created_at,
        created_by: data.created_by,
        admin_id: data.admin_id,
        is_admin: data.is_admin,
      });
    } catch (error: any) {
      console.error('Error loading group details:', error);
      setAlertState({
        visible: true,
        title: 'Error',
        message: 'Failed to load group details. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUserAdmin = () => {
    return groupDetails?.is_admin || false;
  };

  const handleLeaveGroup = () => {
    setConfirmAction({type: 'leave'});
    setShowConfirmModal(true);
  };

  const handleDeleteGroup = () => {
    setConfirmAction({type: 'delete'});
    setShowDeleteModal(true);
  };

  const handleAddMember = () => {
    navigation.navigate('AddMember', {groupId, groupName: groupDetails?.name});
  };

  const handleRemoveMember = (memberId: number, memberName: string) => {
    setConfirmAction({type: 'remove', memberId, memberName});
    setShowConfirmModal(true);
  };

  const confirmActionHandler = async () => {
    if (!confirmAction || !groupDetails || !user?.id) return;

    setProcessing(true);
    try {
      const groupIdNum = parseInt(groupId, 10);
      const userIdNum = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

      if (confirmAction.type === 'leave') {
        await apiService.leaveChatGroup(userIdNum, groupIdNum);
        const successMessage = 'Left group successfully';
        if (Platform.OS === 'android') {
          ToastAndroid.show(successMessage, ToastAndroid.LONG);
        }
        navigation.goBack();
      } else if (confirmAction.type === 'remove' && confirmAction.memberId) {
        await apiService.removeGroupMember(userIdNum, groupIdNum, confirmAction.memberId);
        const successMessage = `${confirmAction.memberName} removed from group`;
        if (Platform.OS === 'android') {
          ToastAndroid.show(successMessage, ToastAndroid.LONG);
        }
        await loadGroupDetails(); // Reload to get updated member list
      } else if (confirmAction.type === 'delete') {
        await apiService.deleteChatGroup(userIdNum, groupIdNum);
        const successMessage = 'Group deleted successfully';
        if (Platform.OS === 'android') {
          ToastAndroid.show(successMessage, ToastAndroid.LONG);
        }
        navigation.navigate('Community');
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      setAlertState({
        visible: true,
        title: 'Error',
        message: error?.message || 'Failed to perform action. Please try again.',
        type: 'error',
      });
    } finally {
      setProcessing(false);
      setShowConfirmModal(false);
      setShowDeleteModal(false);
      setConfirmAction(null);
    }
  };

  // Refresh when screen is focused (e.g., after adding members)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id && groupId) {
        loadGroupDetails();
      }
    });
    return unsubscribe;
  }, [navigation, user?.id, groupId]);

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!groupDetails) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, {color: colors.text}]}>Group not found</Text>
        </View>
      </View>
    );
  }

  const activeMembersCount = groupDetails.members.length;

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
        <Text style={[styles.headerTitle, {color: colors.text}]}>Group Details</Text>
        <View style={styles.headerActions}>
          {isCurrentUserAdmin() && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteGroup}
              activeOpacity={0.7}>
              <MaterialIcons name="delete" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.leaveGroupButton}
            onPress={handleLeaveGroup}
            activeOpacity={0.7}>
            <MaterialIcons name="exit-to-app" size={20} color="#EF4444" />
            <Text style={styles.leaveGroupText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}>
        {/* Group Icon and Name Section */}
        <View style={[styles.groupInfoSection, {borderBottomColor: colors.border}]}>
          <View style={[styles.groupInfoAvatar, {backgroundColor: colors.primary + '20'}]}>
            <MaterialIcons name="groups" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.groupInfoName, {color: colors.text}]}>{groupDetails.name}</Text>
          {groupDetails.description && (
            <Text style={[styles.groupInfoDescription, {color: colors.text, opacity: 0.7}]}>
              {groupDetails.description}
            </Text>
          )}
          <View style={styles.memberStatsContainer}>
            <View style={styles.memberStatItem}>
              <Text style={[styles.memberStatValue, {color: colors.primary}]}>
                {groupDetails.members.length}
              </Text>
              <Text style={[styles.memberStatLabel, {color: colors.text, opacity: 0.7}]}>
                Members
              </Text>
            </View>
            <View style={[styles.memberStatDivider, {backgroundColor: colors.border}]} />
            <View style={styles.memberStatItem}>
              <Text style={[styles.memberStatValue, {color: colors.primary}]}>
                {activeMembersCount}
              </Text>
              <Text style={[styles.memberStatLabel, {color: colors.text, opacity: 0.7}]}>
                Active
              </Text>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text style={[styles.membersTitle, {color: colors.text}]}>Group Members</Text>
            <TouchableOpacity
              style={[styles.addMemberButton, {backgroundColor: colors.primary + '20'}]}
              onPress={handleAddMember}
              activeOpacity={0.7}>
              <MaterialIcons name="person-add" size={20} color={colors.primary} />
              <Text style={[styles.addMemberText, {color: colors.primary}]}>Add Member</Text>
            </TouchableOpacity>
          </View>

          {groupDetails.members && groupDetails.members.length > 0 ? (
            <FlatList
              data={groupDetails.members}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({item}) => {
                const userIdNum = typeof user?.id === 'string' ? parseInt(user.id, 10) : user?.id;
                const isCurrentUser = item.id === userIdNum;
                const firstName = item.first_name || '';
                const lastName = item.last_name || '';
                const initials = getInitials(firstName, lastName);
                const avatarColor = getAvatarColor(firstName, lastName, item.id);

                return (
                  <View style={[styles.memberItem, {borderBottomColor: colors.border}]}>
                    <View style={[styles.memberAvatar, {backgroundColor: avatarColor}]}>
                      <Text style={styles.memberAvatarText}>{initials}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, {color: colors.text}]}>
                          {item.name}
                          {isCurrentUser && ' (You)'}
                        </Text>
                        {item.is_admin && (
                          <View style={[styles.adminBadge, {backgroundColor: colors.primary + '20'}]}>
                            <Text style={[styles.adminBadgeText, {color: colors.primary}]}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.memberEmail, {color: colors.text, opacity: 0.7}]}>
                        {item.email}
                      </Text>
                    </View>
                    {!isCurrentUser && isCurrentUserAdmin() && (
                      <TouchableOpacity
                        style={styles.removeMemberButton}
                        onPress={() => handleRemoveMember(item.id, item.name)}
                        activeOpacity={0.7}>
                        <MaterialIcons name="remove-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          ) : (
            <Text style={[styles.noMembersText, {color: colors.text, opacity: 0.7}]}>
              No members found
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, {backgroundColor: colors.card, borderColor: colors.border}]}>
            <View style={[styles.confirmIconContainer, {backgroundColor: '#FEE2E2'}]}>
              <MaterialIcons
                name={confirmAction?.type === 'leave' ? 'exit-to-app' : 'person-remove'}
                size={48}
                color="#EF4444"
              />
            </View>
            <Text style={[styles.confirmTitle, {color: colors.text}]}>
              {confirmAction?.type === 'leave' ? 'Leave Group' : 'Remove Member'}
            </Text>
            <Text style={[styles.confirmMessage, {color: colors.text, opacity: 0.7}]}>
              {confirmAction?.type === 'leave'
                ? 'Are you sure you want to leave this group? You will no longer receive messages.'
                : `Are you sure you want to remove ${confirmAction?.memberName} from this group?`}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmCancelButton, {borderColor: colors.border}]}
                onPress={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                activeOpacity={0.7}>
                <Text style={[styles.confirmCancelText, {color: colors.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmActionButton}
                onPress={confirmActionHandler}
                activeOpacity={0.7}
                disabled={processing}>
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmActionText}>
                    {confirmAction?.type === 'leave' ? 'Leave' : 'Remove'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Group Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setConfirmAction(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, {backgroundColor: colors.card, borderColor: colors.border}]}>
            <View style={[styles.confirmIconContainer, {backgroundColor: '#FEE2E2'}]}>
              <MaterialIcons name="delete-forever" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.confirmTitle, {color: colors.text}]}>Delete Group</Text>
            <Text style={[styles.confirmMessage, {color: colors.text, opacity: 0.7}]}>
              Are you sure you want to delete this group? This action cannot be undone. All messages and members will be removed.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmCancelButton, {borderColor: colors.border}]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setConfirmAction(null);
                }}
                activeOpacity={0.7}>
                <Text style={[styles.confirmCancelText, {color: colors.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmActionButton}
                onPress={confirmActionHandler}
                activeOpacity={0.7}
                disabled={processing}>
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmActionText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    errorText: {
      fontSize: 16,
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    deleteButton: {
      padding: 8,
    },
    leaveGroupButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    leaveGroupText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#EF4444',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    groupInfoSection: {
      alignItems: 'center',
      padding: 24,
      borderBottomWidth: 1,
    },
    groupInfoAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    groupInfoName: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    groupInfoDescription: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
    },
    memberStatsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginTop: 8,
    },
    memberStatItem: {
      alignItems: 'center',
    },
    memberStatValue: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    memberStatLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    memberStatDivider: {
      width: 1,
      height: 30,
    },
    membersSection: {
      padding: 20,
    },
    membersHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    membersTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    addMemberButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addMemberText: {
      fontSize: 14,
      fontWeight: '600',
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    memberAvatarText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    memberInfo: {
      flex: 1,
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '600',
    },
    adminBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    adminBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    memberEmail: {
      fontSize: 14,
    },
    removeMemberButton: {
      padding: 4,
    },
    noMembersText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    confirmModal: {
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      borderWidth: 1,
    },
    confirmIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    confirmTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    confirmMessage: {
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    confirmButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    confirmCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    confirmCancelText: {
      fontSize: 16,
      fontWeight: '600',
    },
    confirmActionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: '#EF4444',
      alignItems: 'center',
    },
    confirmActionText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default GroupDetailsScreen;
