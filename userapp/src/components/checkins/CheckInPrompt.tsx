import React, {useEffect, useMemo, useState} from 'react';
import {Modal, View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {addCheckInDueListener} from '../../services/checkInEventBus';
import {useCheckInStore} from '../../stores/checkInStore';
import {useAuthStore} from '../../stores/authStore';
import {sendCheckInUpdate} from '../../services/checkInMessagingService';
import {dispatchSOSAlert} from '../../services/sosDispatcher';

const formatTime = (timestamp?: number) => {
  if (!timestamp) {
    return 'Never';
  }
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
};

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

const CheckInPrompt = () => {
  const theme = useTheme();
  const {colors} = theme;
  const [activeId, setActiveId] = useState<string | null>(null);
  const checkIns = useCheckInStore((state) => state.checkIns);
  const markCompleted = useCheckInStore((state) => state.markCompleted);
  const snoozeCheckIn = useCheckInStore((state) => state.snoozeCheckIn);
  const setAwaitingResponse = useCheckInStore((state) => state.setAwaitingResponse);
  const userName = useAuthStore((state) => state.user?.name || 'SafeTNet member');

  const activeCheckIn = useMemo(() => checkIns.find((checkIn) => checkIn.id === activeId), [checkIns, activeId]);
  const tokens = useMemo(
    () => ({
      overlay: theme.dark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.45)',
      snoozeBackground: theme.dark ? withAlpha(colors.primary, 0.28) : withAlpha(colors.primary, 0.12),
      snoozeText: theme.dark ? colors.text : '#0F172A',
    }),
    [colors, theme.dark],
  );

  useEffect(() => {
    const subscription = addCheckInDueListener(({id}) => {
      setActiveId(id);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  if (!activeCheckIn) {
    return null;
  }

  const handleClose = async () => {
    if (activeId) {
      await setAwaitingResponse(activeId, false);
    }
    setActiveId(null);
  };

  const handleConfirmSafe = async () => {
    if (!activeCheckIn) {
      return;
    }
    const sent = await sendCheckInUpdate({checkIn: activeCheckIn, userName});
    if (sent) {
      await markCompleted(activeCheckIn.id);
      setActiveId(null);
    }
  };

  const handleSnooze = async () => {
    if (!activeCheckIn) {
      return;
    }
    await snoozeCheckIn(activeCheckIn.id, 10);
    setActiveId(null);
  };

  const handleNeedHelp = async () => {
    if (!activeCheckIn) {
      return;
    }
    await setAwaitingResponse(activeCheckIn.id, false);
    const escalationMessage = `Check-in escalation: ${userName} may need immediate assistance.`;
    await dispatchSOSAlert(escalationMessage);
    setActiveId(null);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.overlay, {backgroundColor: tokens.overlay}]}>
        <View style={[styles.card, {backgroundColor: colors.card}]}>
          <Text style={[styles.title, {color: colors.text}]}>Time to check in</Text>
          <Text style={[styles.subtitle, {color: colors.text}]}>{`"${activeCheckIn.label}"`}</Text>
          <Text style={[styles.meta, {color: colors.notification}]}>Last completed: {formatTime(activeCheckIn.lastCompletedAt)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, {backgroundColor: tokens.snoozeBackground}]}
              onPress={handleSnooze}>
              <Text style={[styles.snoozeText, {color: tokens.snoozeText}]}>Remind me in 10 min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, {backgroundColor: colors.primary}]}
              onPress={handleConfirmSafe}>
              <Text style={styles.primaryText}>I’m safe</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.alertButton} onPress={handleNeedHelp}>
            <Text style={styles.alertText}>Need help? Trigger SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.dismissText, {color: colors.notification}]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  meta: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  snoozeText: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  alertButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  alertText: {
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  dismissText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
});

export default CheckInPrompt;
