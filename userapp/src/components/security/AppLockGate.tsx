import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {useTheme} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppLockStore} from '../../stores/appLockStore';

interface AppLockGateProps {
  visible: boolean;
}

const AppLockGate: React.FC<AppLockGateProps> = ({visible}) => {
  const {colors, dark} = useTheme();
  const lockType = useAppLockStore((state) => state.lockType);
  const verifyPassword = useAppLockStore((state) => state.verifyPassword);
  const setLocked = useAppLockStore((state) => state.setLocked);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (visible) {
      setValue('');
      setError(null);
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [visible]);

  const handleUnlock = useCallback(() => {
    if (value.trim().length === 0) {
      setError('Please enter your password.');
      return;
    }

    const success = verifyPassword(value.trim());
    if (success) {
      setValue('');
      setError(null);
      setLocked(false);
    } else {
      setError('Incorrect password. Try again.');
    }
  }, [setLocked, value, verifyPassword]);

  const tokens = useMemo(
    () => ({
      surface: dark ? colors.card : '#FFFFFF',
      overlay: 'rgba(15, 23, 42, 0.75)',
      border: colors.border,
      accent: colors.primary,
      text: colors.text,
      subtle: colors.notification,
      destructive: dark ? '#F87171' : '#B91C1C',
    }),
    [colors, dark],
  );

  const label = lockType === 'pin' ? 'Enter 4-digit PIN' : 'Enter password';

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (lockType === 'pin' && value.length === 4) {
      handleUnlock();
    }
  }, [handleUnlock, lockType, value, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.select({ios: 'padding', android: undefined})}
        style={styles.flex}>
        <View style={[styles.overlay, {backgroundColor: tokens.overlay}]}> 
          <View style={[styles.container, {backgroundColor: tokens.surface, borderColor: tokens.border}]}> 
            <View style={styles.iconBadge}>
              <MaterialIcons name="lock" size={28} color={tokens.accent} />
            </View>
            <Text style={[styles.title, {color: tokens.text}]}>App Locked</Text>
            <Text style={[styles.subtitle, {color: tokens.subtle}]}>Protecting your safety data</Text>

            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={(text) => {
                setError(null);
                const sanitized = lockType === 'pin' ? text.replace(/[^0-9]/g, '') : text;
                setValue(lockType === 'pin' ? sanitized.slice(0, 4) : sanitized);
              }}
              secureTextEntry
              keyboardType={lockType === 'pin' ? 'number-pad' : 'default'}
              maxLength={lockType === 'pin' ? 4 : 32}
              placeholder={label}
              placeholderTextColor={tokens.subtle}
              style={[
                styles.input,
                {
                  color: tokens.text,
                  borderColor: error ? tokens.destructive : tokens.border,
                  backgroundColor: dark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleUnlock}
            />
            {error ? (
              <Text style={[styles.error, {color: tokens.destructive}]}>{error}</Text>
            ) : lockType === 'pin' ? (
              <Text style={[styles.pinHint, {color: tokens.subtle}]}>Enter 4 digits to unlock</Text>
            ) : (
              <TouchableOpacity
                style={[styles.unlockButton, {backgroundColor: tokens.accent}]}
                onPress={handleUnlock}
                activeOpacity={0.85}>
                <Text style={styles.unlockButtonText}>Unlock</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
  },
  error: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '500',
  },
  pinHint: {
    fontSize: 14,
    fontWeight: '600',
  },
  unlockButton: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AppLockGate;

