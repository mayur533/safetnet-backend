import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Modal} from 'react-native';
import {useTheme} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {useSubscription} from '../../lib/hooks/useSubscription';

interface UpgradePromptProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  limitType?: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  message,
  onClose,
  limitType,
}) => {
  const {colors, dark} = useTheme();
  const navigation = useNavigation();
  const {requirePremium} = useSubscription();

  const tokens = {
    background: colors.background,
    card: colors.card || (dark ? '#0F172A' : '#FFFFFF'),
    border: colors.border || (dark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0'),
    accent: colors.primary || '#2563EB',
    text: colors.text || '#1F2937',
    muted: dark ? 'rgba(226,232,240,0.7)' : '#475569',
    overlay: dark ? 'rgba(2, 6, 23, 0.8)' : 'rgba(15, 23, 42, 0.45)',
  };

  const handleUpgrade = () => {
    onClose();
    navigation.navigate('Billing' as never);
  };

  const handleDismiss = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}>
      <View style={[styles.overlay, {backgroundColor: tokens.overlay}]}>
        <View style={[styles.modal, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <View style={[styles.iconContainer, {backgroundColor: `${tokens.accent}1F`}]}>
            <MaterialIcons name="workspace-premium" size={32} color={tokens.accent} />
          </View>
          <Text style={[styles.title, {color: tokens.text}]}>Upgrade to Premium</Text>
          <Text style={[styles.message, {color: tokens.muted}]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, {borderColor: tokens.border}]}
              onPress={handleDismiss}
              activeOpacity={0.7}>
              <Text style={[styles.cancelButtonText, {color: tokens.text}]}>Maybe later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.upgradeButton, {backgroundColor: tokens.accent}]}
              onPress={handleUpgrade}
              activeOpacity={0.85}>
              <Text style={styles.upgradeButtonText}>Upgrade now</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  upgradeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default UpgradePrompt;

