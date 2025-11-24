import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator} from 'react-native';
import {useTheme} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {usePanicModeStore} from '../../stores/panicModeStore';
import {startPanicMode, stopPanicMode, addPanicModeListener} from '../../services/panicModeService';
import {useAVRecorderStore} from '../../stores/avRecorderStore';
import {stopEvidenceRecording, clearEvidenceClips} from '../../services/avRecorderService';

const PanicModeScreen = () => {
  const {colors, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const {isPremium, requirePremium} = useSubscription();
  const panicState = usePanicModeStore();
  const [sequence, setSequence] = useState(0);
  const [arming, setArming] = useState(false);
  const evidenceClips = useAVRecorderStore((state) => state.clips);
  const evidenceRecording = useAVRecorderStore((state) => state.isRecording);

  useEffect(() => {
    const subscription = addPanicModeListener(({sequence: seq}) => {
      setSequence(seq);
    });
    return () => subscription.remove();
  }, []);

  const tokens = useMemo(
    () => ({
      background: colors.background,
      card: colors.card || (dark ? '#0F172A' : '#FFFFFF'),
      border: colors.border || (dark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0'),
      accent: colors.primary || '#2563EB',
      text: colors.text || '#1F2937',
      muted: dark ? 'rgba(226,232,240,0.7)' : '#475569',
    }),
    [colors, dark],
  );

  const handleArm = async () => {
    if (!isPremium) {
      requirePremium('Panic mode automation is a Premium feature. Upgrade to unlock rapid SOS loops.');
      return;
    }
    if (panicState.active) {
      stopPanicMode();
      stopEvidenceRecording();
      return;
    }
    setArming(true);
    try {
      await startPanicMode();
      setSequence(0);
    } catch (error) {
      Alert.alert('Panic mode', 'Unable to start panic mode. Please try again.');
    } finally {
      setArming(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: tokens.background, paddingTop: insets.top + 16}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <View style={[styles.heroIcon, {backgroundColor: '#DC2626'}]}>
            <MaterialIcons name="sos" size={28} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, {color: tokens.text}]}>Panic mode automation</Text>
          <Text style={[styles.heroSubtitle, {color: tokens.muted}]}>
            Sends repeated SOS pulses with your live location and triggers loud vibration alerts to deter threats.
          </Text>
          <View style={styles.heroStatusRow}>
            <MaterialIcons
              name={panicState.active ? 'play-circle' : 'pause-circle'}
              size={20}
              color={panicState.active ? '#22C55E' : tokens.muted}
            />
            <Text style={[styles.heroStatusText, {color: tokens.text}]}>
              {panicState.active
                ? `Active • ${sequence} dispatches sent${evidenceRecording ? ' • audio recording' : ''}`
                : 'Currently inactive'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <Text style={[styles.cardTitle, {color: tokens.text}]}>How it works</Text>
          <View style={styles.stepRow}>
            <MaterialIcons name="touch-app" size={20} color={tokens.accent} />
            <Text style={[styles.stepText, {color: tokens.muted}]}>Arm panic mode for rapid emergency loops.</Text>
          </View>
          <View style={styles.stepRow}>
            <MaterialIcons name="notification-important" size={20} color={tokens.accent} />
            <Text style={[styles.stepText, {color: tokens.muted}]}>
              Every few seconds, we buzz loudly and send your SOS template automatically.
            </Text>
          </View>
          <View style={styles.stepRow}>
            <MaterialIcons name="stop-circle" size={20} color={tokens.accent} />
            <Text style={[styles.stepText, {color: tokens.muted}]}>Stop panic mode once you are safe.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {backgroundColor: panicState.active ? '#DC2626' : tokens.accent},
            arming && {opacity: 0.6},
          ]}
          onPress={handleArm}
          disabled={arming}
          activeOpacity={0.85}>
          {arming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name={panicState.active ? 'stop' : 'play-arrow'} size={22} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{panicState.active ? 'Stop panic mode' : 'Start panic mode'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.card, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <Text style={[styles.cardTitle, {color: tokens.text}]}>Best practices</Text>
          <Text style={[styles.tipText, {color: tokens.muted}]}>
            • Make sure your SOS template includes key instructions for responders.
          </Text>
          <Text style={[styles.tipText, {color: tokens.muted}]}>
            • Keep your device in a pocket or bag for discreet activation.
          </Text>
          <Text style={[styles.tipText, {color: tokens.muted}]}>
            • Pair panic mode with live tracking for precise hand-offs.
          </Text>
        </View>

        {evidenceClips.length > 0 ? (
          <View style={[styles.card, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.cardTitle, {color: tokens.text}]}>Saved evidence clips</Text>
              <TouchableOpacity onPress={clearEvidenceClips} activeOpacity={0.7}>
                <Text style={[styles.clearHistoryText, {color: tokens.accent}]}>Clear</Text>
              </TouchableOpacity>
            </View>
            {evidenceClips.map((clip) => (
              <View key={clip.id} style={styles.historyRow}>
                <MaterialIcons name="audiotrack" size={20} color={tokens.accent} />
                <View style={{flex: 1}}>
                  <Text style={[styles.historyText, {color: tokens.text}]}>
                    {new Date(clip.startedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                  <Text style={[styles.historyMeta, {color: tokens.muted}]}>
                    {(clip.sizeBytes / 1_048_576).toFixed(1)} MB •{' '}
                    {Math.max(1, Math.round((clip.endedAt - clip.startedAt) / 1000))} sec
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  historyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyMeta: {
    fontSize: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default PanicModeScreen;

