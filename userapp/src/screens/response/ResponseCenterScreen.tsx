import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert} from 'react-native';
import {useTheme} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useResponseCenterStore, ResponseStatus} from '../../stores/responseCenterStore';
import {notifyResponseCenter, cancelActiveResponseRequest} from '../../services/responseCenterService';

type AccentKey = 'accent' | 'success' | 'warning' | 'danger';

interface StatusMeta {
  title: string;
  description: string;
  icon: string;
  accentKey: AccentKey;
}

const STATUS_META_MAP: Record<ResponseStatus, StatusMeta> = {
  initiated: {
    title: 'Request received',
    description: 'We logged your emergency and are alerting responders.',
    icon: 'schedule',
    accentKey: 'accent',
  },
  acknowledged: {
    title: 'Responder acknowledged',
    description: 'A dispatcher confirmed your alert.',
    icon: 'fact-check',
    accentKey: 'accent',
  },
  responder_assigned: {
    title: 'Responder assigned',
    description: 'A responder is dialing you now.',
    icon: 'support-agent',
    accentKey: 'success',
  },
  connecting: {
    title: 'Connecting call',
    description: 'Setting up a 3-way line with your trusted contact.',
    icon: 'call',
    accentKey: 'warning',
  },
  connected: {
    title: 'Live on the line',
    description: 'Stay with the responder while help is coordinated.',
    icon: 'call-merge',
    accentKey: 'success',
  },
  resolved: {
    title: 'Case resolved',
    description: 'Responder confirmed the situation is handled.',
    icon: 'verified',
    accentKey: 'success',
  },
  failed: {
    title: 'Response unavailable',
    description: 'We could not complete the hand-off. Try again shortly.',
    icon: 'report-problem',
    accentKey: 'danger',
  },
  cancelled: {
    title: 'Request cancelled',
    description: 'You cancelled the response center hand-off.',
    icon: 'cancel',
    accentKey: 'warning',
  },
};

const getStatusMeta = (status: ResponseStatus, responderName?: string): StatusMeta => {
  const base = STATUS_META_MAP[status];
  if (status === 'responder_assigned' && responderName) {
    return {
      ...base,
      description: `${responderName} is dialing you now.`,
    };
  }
  return base;
};

const ResponseCenterScreen = () => {
  const {colors, dark} = useTheme();
  const {isPremium, requirePremium} = useSubscription();
  const insets = useSafeAreaInsets();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const requests = useResponseCenterStore((state) => state.requests);
  const activeRequestId = useResponseCenterStore((state) => state.activeRequestId);
  const loadRequests = useResponseCenterStore((state) => state.load);
  const clearHistory = useResponseCenterStore((state) => state.clearHistory);

  const tokens = useMemo(
    () => ({
      background: colors.background,
      card: colors.card || (dark ? '#0F172A' : '#FFFFFF'),
      border: colors.border || (dark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0'),
      accent: colors.primary || '#2563EB',
      text: colors.text || '#1F2937',
      muted: dark ? 'rgba(226,232,240,0.7)' : '#475569',
      success: '#22C55E',
      warning: '#F97316',
      danger: '#EF4444',
    }),
    [colors, dark],
  );

  useEffect(() => {
    loadRequests().catch((error) => console.warn('Failed to load response center requests', error));
  }, [loadRequests]);

  const activeRequest = useMemo(
    () => requests.find((request) => request.id === activeRequestId) ?? null,
    [requests, activeRequestId],
  );

  const timelineEntries = useMemo(() => {
    if (!activeRequest) {
      return [];
    }
    return [...activeRequest.timeline].sort((a, b) => a.timestamp - b.timestamp);
  }, [activeRequest]);

  const historyRequests = useMemo(
    () => requests.filter((request) => request.id !== activeRequestId),
    [requests, activeRequestId],
  );

  const statusMeta = activeRequest ? getStatusMeta(activeRequest.status, activeRequest.responderName) : null;
  const accentColor = statusMeta ? getAccentColor(statusMeta.accentKey) : tokens.accent;

  const getAccentColor = (accent: AccentKey) => {
    switch (accent) {
      case 'success':
        return tokens.success;
      case 'warning':
        return tokens.warning;
      case 'danger':
        return tokens.danger;
      default:
        return tokens.accent;
    }
  };

  const withAlpha = (color: string, alpha: number) => {
    if (!color) {
      return `rgba(37, 99, 235, ${alpha})`;
    }
    if (!color.startsWith('#')) {
      return color;
    }
    const sanitized = color.replace('#', '');
    const normalized =
      sanitized.length === 3
        ? sanitized
            .split('')
            .map((char) => char + char)
            .join('')
        : sanitized.slice(0, 6);
    const r = parseInt(normalized.substring(0, 2), 16);
    const g = parseInt(normalized.substring(2, 4), 16);
    const b = parseInt(normalized.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const handleRequestAssistance = () => {
    if (!isPremium) {
      requirePremium(
        'Upgrade to unlock 24×7 emergency response. Our verified responders will coordinate help on your behalf.',
      );
      return;
    }
    if (activeRequest) {
      Alert.alert(
        'Responder already active',
        'Our response desk is already coordinating with you. You can cancel the existing request below if needed.',
      );
      return;
    }
    setShowRequestModal(true);
  };

  const confirmRequest = async () => {
    setRequesting(true);
    try {
      await notifyResponseCenter({
        incidentId: `manual-${Date.now()}`,
        message: 'Manual assistance requested from Response Center screen.',
        smsSent: false,
        callPlaced: false,
        recipients: [],
      });
      Alert.alert('Responders notified', 'Stay reachable. Our team is on the way to help you.');
      setShowRequestModal(false);
    } catch (error) {
      console.warn('Manual response center request failed', error);
      Alert.alert('Unable to reach responders', 'Please try again in a moment.');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = () => {
    if (!activeRequest) {
      return;
    }
    Alert.alert(
      'Cancel responder hand-off?',
      'If you cancel, our response center will stand down and stop calling your contacts.',
      [
        {text: 'Stay connected', style: 'cancel'},
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: () => {
            cancelActiveResponseRequest().catch((error) =>
              console.warn('Failed to cancel response request', error),
            );
          },
        },
      ],
    );
  };

  const handleClearHistory = () => {
    if (historyRequests.length === 0) {
      return;
    }
    Alert.alert(
      'Clear response history?',
      'This will remove the record of previous response center hand-offs.',
      [
        {text: 'Keep history', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory().catch((error) => console.warn('Failed to clear response history', error));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: tokens.background, paddingTop: insets.top + 16}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <View
            style={[
              styles.heroIcon,
              {backgroundColor: withAlpha(getAccentColor(statusMeta?.accentKey ?? 'accent'), 0.16)},
            ]}>
            <MaterialIcons
              name={statusMeta?.icon ?? 'support-agent'}
              size={28}
              color={getAccentColor(statusMeta?.accentKey ?? 'accent')}
            />
          </View>
          <Text style={[styles.heroTitle, {color: tokens.text}]}>
            {activeRequest ? 'Responder coordinating now' : '24×7 Emergency Response'}
          </Text>
          <Text style={[styles.heroSubtitle, {color: tokens.muted}]}>
            {activeRequest
              ? statusMeta?.description ??
                'Our desk is coordinating support. Stay reachable while we connect the line.'
              : 'Our verified responders stay on call round the clock to escalate your alerts and coordinate with local authorities when every second matters.'}
          </Text>
          {activeRequest ? (
            <>
              <View style={[styles.statusBadge, {borderColor: accentColor}]}>
                <MaterialIcons name={statusMeta?.icon ?? 'support-agent'} size={18} color={accentColor} />
                <Text style={[styles.statusBadgeText, {color: accentColor}]}>{statusMeta?.title}</Text>
              </View>
              <Text style={[styles.heroMeta, {color: tokens.muted}]}>
                Started{' '}
                {new Date(activeRequest.startedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
              </Text>
            </>
          ) : null}
          <TouchableOpacity
            style={[
              styles.heroButton,
              {borderColor: tokens.accent},
              isPremium && !activeRequest && {backgroundColor: tokens.accent},
              isPremium && activeRequest && {borderColor: accentColor, backgroundColor: withAlpha(accentColor, 0.15)},
              !isPremium && {backgroundColor: withAlpha(tokens.accent, 0.16)},
            ]}
            onPress={activeRequest ? handleCancelRequest : handleRequestAssistance}
            activeOpacity={0.85}>
            {activeRequest ? (
              <>
                <MaterialIcons name="cancel" size={20} color={accentColor} />
                <Text style={[styles.heroButtonText, {color: accentColor}]}>Cancel request</Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name={isPremium ? 'support-agent' : 'lock'}
                  size={20}
                  color={isPremium ? '#FFFFFF' : tokens.accent}
                />
                <Text
                  style={[
                    styles.heroButtonText,
                    {color: isPremium ? '#FFFFFF' : tokens.accent},
                  ]}>
                  {isPremium ? 'Contact responders now' : 'Upgrade for 24×7 response'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {activeRequest ? (
          <View style={[styles.sectionCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
            <View style={styles.timelineHeader}>
              <Text style={[styles.sectionTitle, {color: tokens.text}]}>Live timeline</Text>
              <Text style={[styles.timelineMeta, {color: tokens.muted}]}>
                Updated {formatTimestamp(activeRequest.lastUpdatedAt)}
              </Text>
            </View>
            {timelineEntries.map((entry, index) => {
              const entryMeta = getStatusMeta(entry.status, activeRequest.responderName);
              const entryColor = getAccentColor(entryMeta.accentKey);
              const isLast = index === timelineEntries.length - 1;
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.timelineRow,
                    !isLast && {borderBottomWidth: 1, borderColor: tokens.border},
                  ]}>
                  <View style={[styles.timelineIcon, {backgroundColor: withAlpha(entryColor, 0.15)}]}>
                    <MaterialIcons name={entryMeta.icon} size={18} color={entryColor} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, {color: tokens.text}]}>{entryMeta.title}</Text>
                    <Text style={[styles.timelineSubtitle, {color: tokens.muted}]}>
                      {entry.note ?? entryMeta.description}
                    </Text>
                  </View>
                  <Text style={[styles.timelineTime, {color: tokens.muted}]}>{formatTimestamp(entry.timestamp)}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {historyRequests.length > 0 ? (
          <View style={[styles.sectionCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, {color: tokens.text}]}>Recent hand-offs</Text>
              <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
                <Text style={[styles.clearHistoryText, {color: tokens.accent}]}>Clear</Text>
              </TouchableOpacity>
            </View>
            {historyRequests.slice(0, 5).map((request, index) => {
              const meta = getStatusMeta(request.status, request.responderName);
              const color = getAccentColor(meta.accentKey);
              const isLast = index === Math.min(historyRequests.length, 5) - 1;
              return (
                <View
                  key={request.id}
                  style={[
                    styles.historyRow,
                    !isLast && {borderBottomWidth: 1, borderColor: tokens.border},
                  ]}>
                  <View style={[styles.historyIcon, {backgroundColor: withAlpha(color, 0.15)}]}>
                    <MaterialIcons name={meta.icon} size={18} color={color} />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyTitle, {color: tokens.text}]}>{meta.title}</Text>
                    <Text style={[styles.historySubtitle, {color: tokens.muted}]}>
                      {new Date(request.startedAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={[styles.sectionCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <Text style={[styles.sectionTitle, {color: tokens.text}]}>How it works</Text>
          {HOW_IT_WORKS.map((item) => (
            <View key={item.title} style={styles.stepRow}>
              <View style={[styles.stepIcon, {backgroundColor: 'rgba(37, 99, 235, 0.16)'}]}>
                <MaterialIcons name={item.icon as any} size={20} color={tokens.accent} />
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, {color: tokens.text}]}>{item.title}</Text>
                <Text style={[styles.stepSummary, {color: tokens.muted}]}>{item.summary}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.sectionCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <Text style={[styles.sectionTitle, {color: tokens.text}]}>What responders can do</Text>
          {CAPABILITIES.map((item) => (
            <View key={item.title} style={styles.capabilityRow}>
              <MaterialIcons name={item.icon as any} size={20} color={tokens.accent} />
              <View style={{flex: 1}}>
                <Text style={[styles.capabilityTitle, {color: tokens.text}]}>{item.title}</Text>
                <Text style={[styles.capabilitySummary, {color: tokens.muted}]}>{item.summary}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.sectionCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <Text style={[styles.sectionTitle, {color: tokens.text}]}>Premium verification</Text>
          <View style={styles.verificationRow}>
            <MaterialIcons name="badge" size={24} color={tokens.accent} />
            <Text style={[styles.verificationText, {color: tokens.muted}]}>
              Every responder is background-checked, trained on emergency protocols, and monitored for response SLAs.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showRequestModal} transparent animationType="fade" onRequestClose={() => setShowRequestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="support" size={22} color={tokens.accent} />
              <Text style={[styles.modalTitle, {color: tokens.text}]}>Confirm assistance</Text>
            </View>
            <Text style={[styles.modalBody, {color: tokens.muted}]}>
              Our response center will call you and your trusted contacts to coordinate help. Continue?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, {borderColor: tokens.border}]}
                onPress={() => setShowRequestModal(false)}
                activeOpacity={0.7}>
                <Text style={[styles.modalButtonText, {color: tokens.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {backgroundColor: tokens.accent, borderColor: tokens.accent},
                  requesting && {opacity: 0.6},
                ]}
                onPress={confirmRequest}
                disabled={requesting}
                activeOpacity={0.85}>
                <Text style={[styles.modalButtonText, {color: '#FFFFFF'}]}>
                  {requesting ? 'Contacting…' : 'Contact now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const HOW_IT_WORKS = [
  {
    icon: 'sos',
    title: 'Trigger SOS',
    summary: 'Your alert and live location reach our response desk instantly.',
  },
  {
    icon: 'headset-mic',
    title: 'Responder calls back',
    summary: 'A trained responder calls you (and backup contacts) to assess urgency.',
  },
  {
    icon: 'verified-user',
    title: 'Coordinate help',
    summary: 'We coordinate with local services (police, ambulance) while staying on the line.',
  },
];

const CAPABILITIES = [
  {
    icon: 'call',
    title: 'Human callback in under 30 seconds',
    summary: 'Rest assured that someone confirms your situation even if you cannot speak.',
  },
  {
    icon: 'location-searching',
    title: 'Location tracking hand-off',
    summary: 'Live location data is shared with authorities when escalation is required.',
  },
  {
    icon: 'integration-instructions',
    title: 'Integrated incident log',
    summary: 'Response actions get appended to your incident history for follow-up.',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 18,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  heroButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroMeta: {
    fontSize: 13,
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineMeta: {
    fontSize: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearHistoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySubtitle: {
    fontSize: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  capabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  capabilitySummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verificationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ResponseCenterScreen;


