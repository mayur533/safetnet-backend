import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useTheme} from '@react-navigation/native';
import type {Theme} from '@react-navigation/native';
import {useSubscription, FREE_TRUSTED_CIRCLE_LIMIT} from '../../lib/hooks/useSubscription';
import {apiService} from '../../services/apiService';
import {useAuthStore} from '../../stores/authStore';

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: Date;
  avatar?: string;
  isUnread?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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

const CommunityScreen = () => {
  const navigation = useNavigation<any>();
  const {isPremium, requirePremium} = useSubscription();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark;
  const user = useAuthStore((state) => state.user);
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const mutedTextColor = isDarkMode ? 'rgba(226, 232, 240, 0.72)' : '#6B7280';
  const secondaryTextColor = isDarkMode ? 'rgba(148, 163, 184, 0.8)' : '#9CA3AF';
  const noticeIconColor = isDarkMode ? withAlpha(colors.primary, 0.85) : '#C026D3';
  const noticeTextColor = isDarkMode ? withAlpha(colors.primary, 0.85) : '#4C1D95';
  const noticeBackground = isDarkMode ? withAlpha(colors.primary, 0.18) : '#F5F3FF';
  const noticeBorder = isDarkMode ? withAlpha(colors.primary, 0.35) : '#E0E7FF';
  const disabledButtonColor = isDarkMode ? withAlpha(colors.primary, 0.25) : '#9CA3AF';
  const highlightBackground = isDarkMode ? withAlpha(colors.primary, 0.22) : '#EFF6FF';
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);


  // Load groups from API
  useEffect(() => {
    loadGroups();
  }, [user]);

  // Refresh when screen is focused (e.g., after creating a group)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id) {
        loadGroups();
      }
    });
    return unsubscribe;
  }, [navigation, user?.id]);

  const loadGroups = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const groupsData = await apiService.getChatGroups(parseInt(user.id.toString()));
      const transformedGroups: Group[] = Array.isArray(groupsData) 
        ? groupsData.map((group: any) => ({
            id: group.id?.toString() || '',
            name: group.name || '',
            description: group.description,
            memberCount: group.member_count || group.members?.length || 0,
            lastMessage: undefined, // Will be populated when messages are loaded
            lastMessageTime: group.updated_at ? new Date(group.updated_at) : undefined,
            avatar: undefined,
            isUnread: false,
          }))
        : [];
      setGroups(transformedGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('Chat', {groupId: group.id, groupName: group.name});
  };

  const handleCreateGroup = (newGroup: Group) => {
    setGroups([newGroup, ...groups]);
    // Navigate to the new group chat
    navigation.navigate('Chat', {groupId: newGroup.id, groupName: newGroup.name});
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderGroupItem = ({item}: {item: Group}) => (
    <TouchableOpacity
      style={[
        styles.groupItem,
        {backgroundColor: colors.card},
        item.isUnread && {backgroundColor: highlightBackground, borderLeftColor: colors.primary, borderLeftWidth: 3},
      ]}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}>
      <View style={[styles.groupAvatar, {backgroundColor: highlightBackground}]}>
        <MaterialIcons name="groups" size={32} color={colors.primary} />
      </View>
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={[styles.groupName, {color: colors.text}]}>{item.name}</Text>
          {item.lastMessageTime && (
            <Text style={[styles.groupTime, {color: secondaryTextColor}]}>{formatTime(item.lastMessageTime)}</Text>
          )}
        </View>
        {item.description && (
          <Text style={[styles.groupDescription, {color: mutedTextColor}]}>{item.description}</Text>
        )}
        {item.lastMessage && (
          <Text style={[styles.groupLastMessage, {color: mutedTextColor}]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
        <View style={styles.groupFooter}>
          <Text style={[styles.memberCount, {color: secondaryTextColor}]}>{item.memberCount} members</Text>
          {item.isUnread && <View style={[styles.unreadBadge, {backgroundColor: colors.primary}]} />}
        </View>
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: mutedTextColor}]}>Loading groups...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.scrollContent, {paddingBottom: 24 + insets.bottom}]}>
          <TouchableOpacity
            style={[
              styles.createButton,
              {backgroundColor: colors.primary},
              !isPremium && groups.length >= FREE_TRUSTED_CIRCLE_LIMIT && {backgroundColor: disabledButtonColor},
            ]}
            onPress={() => {
              if (!isPremium && groups.length >= FREE_TRUSTED_CIRCLE_LIMIT) {
                requirePremium('Free members can create up to 2 trusted circles. Upgrade for unlimited circles and premium community support.');
                return;
              }
              navigation.navigate('CreateGroup', {onGroupCreated: handleCreateGroup});
            }}
            activeOpacity={0.7}>
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>

          {!isPremium && (
            <View style={[styles.noticeCard, {backgroundColor: noticeBackground, borderColor: noticeBorder}]}>
              <MaterialIcons name="workspace-premium" size={20} color={noticeIconColor} />
              <Text style={[styles.noticeText, {color: noticeTextColor}]}>
                Premium Community Support unlocks unlimited trusted circles and access to our verified responder network.
              </Text>
            </View>
          )}

          {!isPremium && (
            <View style={styles.limitRow}>
              <Text style={[styles.limitLabel, {color: colors.text}]}>Trusted Circles</Text>
              <Text style={[styles.limitValue, {color: colors.primary}]}>{Math.min(groups.length, FREE_TRUSTED_CIRCLE_LIMIT)} / {FREE_TRUSTED_CIRCLE_LIMIT}</Text>
            </View>
          )}

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="groups" size={64} color={secondaryTextColor} />
              <Text style={[styles.emptyStateText, {color: colors.text}]}>No groups yet</Text>
              <Text style={[styles.emptyStateSubtext, {color: mutedTextColor}]}>Create your first group to get started</Text>
            </View>
          ) : (
            <FlatList
              data={groups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: Theme['colors'], isDarkMode: boolean) => {
  const cardShadowColor = isDarkMode ? 'rgba(15, 23, 42, 0.45)' : '#000000';

  return StyleSheet.create({
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
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
      marginBottom: 20,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    noticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      marginBottom: 20,
    },
    noticeText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    limitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      marginBottom: 12,
    },
    limitLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    limitValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
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
    groupItem: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: cardShadowColor,
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: isDarkMode ? 0.25 : 0.08,
      shadowRadius: isDarkMode ? 4 : 2,
      elevation: isDarkMode ? 4 : 2,
    },
    groupAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    groupContent: {
      flex: 1,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
    },
    groupTime: {
      fontSize: 12,
      marginLeft: 8,
    },
    groupDescription: {
      fontSize: 14,
      marginBottom: 4,
    },
    groupLastMessage: {
      fontSize: 14,
      marginBottom: 8,
    },
    groupFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    memberCount: {
      fontSize: 12,
    },
    unreadBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
};

export default CommunityScreen;
