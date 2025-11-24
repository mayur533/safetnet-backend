import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '@react-navigation/native';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {useCheckInStore, CheckInFrequency} from '../../stores/checkInStore';
import {useContactStore} from '../../stores/contactStore';
import {useAuthStore} from '../../stores/authStore';
import {sendCheckInUpdate} from '../../services/checkInMessagingService';

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

const frequencyOptions: {value: CheckInFrequency; label: string}[] = [
  {value: 180, label: 'Every 3 hours'},
  {value: 360, label: 'Every 6 hours'},
  {value: 720, label: 'Every 12 hours'},
  {value: 1440, label: 'Every day'},
];

const formatRelativeTime = (timestamp: number) => {
  const diff = timestamp - Date.now();
  if (diff <= 0) {
    return 'Due now';
  }
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) {
    return `In ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `In ${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
  }
  const days = Math.floor(hours / 24);
  return `In ${days} day${days > 1 ? 's' : ''}`;
};

const TrustedCheckInScreen = () => {
  const theme = useTheme();
  const {colors} = theme;
  const {isPremium, requirePremium} = useSubscription();
  const checkIns = useCheckInStore((state) => state.checkIns);
  const addCheckIn = useCheckInStore((state) => state.addCheckIn);
  const removeCheckIn = useCheckInStore((state) => state.removeCheckIn);
  const markCompleted = useCheckInStore((state) => state.markCompleted);
  const contacts = useContactStore((state) => state.contacts);
  const userName = useAuthStore((state) => state.user?.name || 'SafeTNet member');

  const [modalVisible, setModalVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [frequency, setFrequency] = useState<CheckInFrequency>(360);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeStyles = useMemo(
    () => ({
      card: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      textPrimary: {
        color: colors.text,
      },
      textMuted: {
        color: colors.notification,
      },
      softPrimary: withAlpha(colors.primary, 0.16),
    }),
    [colors],
  );

  const resetModal = () => {
    setLabel('');
    setFrequency(360);
    setSelectedContactIds([]);
    setIsSubmitting(false);
  };

  const openModal = () => {
    if (!isPremium) {
      requirePremium('Trusted circle check-ins are a Premium feature. Upgrade to keep your circle in the loop.');
      return;
    }
    resetModal();
    setModalVisible(true);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  const handleCreate = async () => {
    if (!label.trim()) {
      Alert.alert('Name required', 'Give this check-in a name so your circle knows what it’s about.');
      return;
    }
    if (selectedContactIds.length === 0) {
      Alert.alert('Select contacts', 'Choose at least one contact to receive your check-in updates.');
      return;
    }
    try {
      setIsSubmitting(true);
      await addCheckIn({label, contactIds: selectedContactIds, frequencyMinutes: frequency});
      setModalVisible(false);
    } catch (error) {
      console.error('Unable to create check-in', error);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNow = async (id: string) => {
    const checkIn = checkIns.find((item) => item.id === id);
    if (!checkIn) {
      return;
    }
    const success = await sendCheckInUpdate({checkIn, userName});
    if (success) {
      await markCompleted(id);
    }
  };

  const handleConfirmSafe = async (id: string) => {
    try {
      await markCompleted(id);
      Alert.alert('Check-in confirmed', 'We let your circle know you’re safe.');
    } catch (error) {
      console.warn('Failed to confirm check-in', error);
      Alert.alert('Something went wrong', 'Please try again shortly.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove check-in', 'Are you sure you want to delete this check-in?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeCheckIn(id);
        },
      },
    ]);
  };

  if (!isPremium) {
    return (
      <View style={[styles.gatedContainer, {backgroundColor: colors.background}]}>
        <View style={[styles.gatedCard, themeStyles.card]}>
          <MaterialIcons name="verified-user" size={48} color={colors.primary} />
          <Text style={[styles.gatedTitle, themeStyles.textPrimary]}>Trusted circle check-ins</Text>
          <Text style={[styles.gatedText, themeStyles.textMuted]}>
            Keep your circle updated automatically. Upgrade to Premium to schedule check-ins and share your status.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, {backgroundColor: colors.primary}]}
            onPress={() => requirePremium()}
            activeOpacity={0.85}>
            <Text style={styles.upgradeButtonText}>See premium plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}
>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, themeStyles.card]}>
          <View style={styles.headerRow}>
            <MaterialIcons name="schedule" size={28} color={colors.primary} />
            <View style={{flex: 1}}>
              <Text style={[styles.headerTitle, themeStyles.textPrimary]}>Your check-in schedule</Text>
              <Text style={[styles.headerSubtitle, themeStyles.textMuted]}>
                Set recurring reminders to confirm you’re safe. We’ll nudge you and notify your trusted circle.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, {backgroundColor: colors.primary}]}
            onPress={openModal}
            activeOpacity={0.85}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>New check-in</Text>
          </TouchableOpacity>
        </View>

        {checkIns.length === 0 ? (
          <View style={[styles.emptyState, themeStyles.card]}>
            <MaterialIcons name="playlist-add-check" size={40} color={colors.primary} />
            <Text style={[styles.emptyTitle, themeStyles.textPrimary]}>No check-ins yet</Text>
            <Text style={[styles.emptySubtitle, themeStyles.textMuted]}>
              Create your first check-in to keep family and friends updated on your status.
            </Text>
          </View>
        ) : (
          checkIns
            .sort((a, b) => a.nextTriggerAt - b.nextTriggerAt)
            .map((checkIn) => {
              const contactLabels = contacts
                .filter((contact) => checkIn.contactIds.includes(contact.id))
                .map((contact) => contact.name || contact.phone);
              const description = contactLabels.length > 0 ? contactLabels.join(', ') : 'No contacts selected';
              const awaiting = checkIn.awaitingResponse;
              const nextReminderLabel = awaiting
                ? 'Awaiting your confirmation'
                : `Next reminder: ${formatRelativeTime(checkIn.nextTriggerAt)}`;
              return (
                <View key={checkIn.id} style={[styles.checkInCard, themeStyles.card]}>
                  <View style={styles.checkInHeader}>
                    <View style={{flex: 1}}>
                      <Text style={[styles.checkInTitle, themeStyles.textPrimary]}>{checkIn.label}</Text>
                      <Text style={[styles.checkInMeta, themeStyles.textMuted]}>
                        {frequencyOptions.find((option) => option.value === checkIn.frequencyMinutes)?.label}
                      </Text>
                    </View>
                    {checkIn.awaitingResponse ? (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>Awaiting response</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.checkInContacts, themeStyles.textMuted]}>{description}</Text>
                  <Text style={[styles.nextReminder, themeStyles.textMuted]}>{nextReminderLabel}</Text>
                  {checkIn.lastReminderSentAt ? (
                    <Text style={[styles.reminderHistory, themeStyles.textMuted]}>
                      Last update sent {formatRelativeTime(checkIn.lastReminderSentAt)} • Attempts {checkIn.reminderAttempts}
                    </Text>
                  ) : null}
                  <View style={styles.checkInActions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => handleDelete(checkIn.id)}>
                      <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                      <Text style={styles.secondaryButtonTextDanger}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryButton, {borderColor: colors.primary}]}
                      onPress={() => handleSendNow(checkIn.id)}>
                      <MaterialIcons name="send" size={20} color={colors.primary} />
                      <Text style={[styles.secondaryButtonText, {color: colors.primary}]}>Send update now</Text>
                    </TouchableOpacity>
                    {awaiting ? (
                      <TouchableOpacity
                        style={[styles.secondaryButton, {borderColor: colors.primary}]}
                        onPress={() => handleConfirmSafe(checkIn.id)}>
                        <MaterialIcons name="task-alt" size={20} color={colors.primary} />
                        <Text style={[styles.secondaryButtonText, {color: colors.primary}]}>
                          Confirm I’m safe
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, themeStyles.card]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themeStyles.textPrimary]}>New check-in</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalLabel, themeStyles.textMuted]}>Check-in name</Text>
            <TextInput
              style={[styles.input, themeStyles.textPrimary, {borderColor: colors.border}]}
              placeholder="e.g. Evening commute"
              placeholderTextColor={colors.notification}
              value={label}
              onChangeText={setLabel}
            />

            <Text style={[styles.modalLabel, themeStyles.textMuted]}>How often?</Text>
            <View style={styles.optionsGrid}>
              {frequencyOptions.map((option) => {
                const selected = option.value === frequency;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionChip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? themeStyles.softPrimary : 'transparent',
                      },
                    ]}
                    onPress={() => setFrequency(option.value)}>
                    <Text
                      style={[
                        styles.optionChipText,
                        {color: selected ? colors.primary : colors.text},
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, themeStyles.textMuted]}>Who should receive updates?</Text>
            <View style={styles.contactList}>
              {contacts.length === 0 ? (
                <Text style={styles.noContactsText}>
                  Add emergency contacts first so we know who to message.
                </Text>
              ) : (
                contacts.map((contact) => {
                  const selected = selectedContactIds.includes(contact.id);
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={[
                        styles.contactChip,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? themeStyles.softPrimary : 'transparent',
                        },
                      ]}
                      onPress={() => toggleContact(contact.id)}>
                      <MaterialIcons
                        name={selected ? 'check-circle' : 'radio-button-unchecked'}
                        size={20}
                        color={selected ? colors.primary : colors.notification}
                      />
                      <Text style={[styles.contactChipText, themeStyles.textPrimary]}>
                        {contact.name || contact.phone}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, {backgroundColor: colors.primary}]}
              onPress={handleCreate}
              disabled={isSubmitting}>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Saving...' : 'Save check-in'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  checkInCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkInMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  checkInContacts: {
    fontSize: 14,
  },
  nextReminder: {
    fontSize: 13,
  },
  checkInActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  secondaryButtonTextDanger: {
    fontWeight: '600',
    color: '#DC2626',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF08A',
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactList: {
    gap: 8,
    maxHeight: 180,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  contactChipText: {
    fontSize: 15,
    flex: 1,
  },
  noContactsText: {
    fontSize: 14,
    color: '#64748B',
  },
  gatedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  gatedCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  gatedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  gatedText: {
    fontSize: 15,
    textAlign: 'center',
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default TrustedCheckInScreen;
