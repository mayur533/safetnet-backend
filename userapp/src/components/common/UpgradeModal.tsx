import React from 'react';
import {Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '@react-navigation/native';
import {useUpgradeModalStore} from '../../stores/upgradeModalStore';
import {navigate} from '../../navigation/navigationRef';

export const UpgradeModal = () => {
  const {colors, dark} = useTheme();
  const {visible, title, message, bullets, ctaLabel, onUpgrade, close} = useUpgradeModalStore();

  const handleUpgrade = () => {
    close();
    if (onUpgrade) {
      onUpgrade();
      return;
    }
    navigate('Billing');
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.container, {backgroundColor: colors.card}]}>
          <View style={styles.iconWrapper}>
            <MaterialIcons name="workspace-premium" size={28} color="#FBBF24" />
          </View>
          <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
          <Text style={[styles.message, {color: colors.text}]}>{message}</Text>
          <ScrollView style={styles.bulletList} showsVerticalScrollIndicator={false}>
            {bullets.map((bullet, idx) => (
              <View key={`${bullet}-${idx}`} style={styles.bulletRow}>
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
                <Text style={[styles.bulletText, {color: colors.text}]}>{bullet}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.secondaryBtn, {borderColor: colors.border}]} onPress={close}>
              <Text style={[styles.secondaryText, {color: dark ? '#F8FAFC' : '#0F172A'}]}>Maybe later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUpgrade} activeOpacity={0.8}>
              <Text style={styles.primaryText}>{ctaLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 16,
  },
  bulletList: {
    maxHeight: 160,
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  bulletText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default UpgradeModal;

