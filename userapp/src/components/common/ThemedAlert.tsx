import React from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '@react-navigation/native';

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onDismiss?: () => void;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{text: 'OK', onPress: () => {}}],
  onDismiss,
}) => {
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark || false;
  
  // Safe color access with fallbacks
  const cardColor = colors.card || (isDarkMode ? '#1E293B' : '#F9FAFB');
  const textColor = colors.text || (isDarkMode ? '#F8FAFC' : '#111827');
  const primaryColor = colors.primary || (isDarkMode ? '#60A5FA' : '#2563EB');

  const getTypeColors = () => {
    switch (type) {
      case 'error':
        return {
          icon: 'error',
          iconColor: '#EF4444',
          bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
          borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
        };
      case 'success':
        return {
          icon: 'check-circle',
          iconColor: '#10B981',
          bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
          borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        };
      case 'warning':
        return {
          icon: 'warning',
          iconColor: '#F59E0B',
          bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB',
          borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
        };
      default:
        return {
          icon: 'info',
          iconColor: '#3B82F6',
          bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
          borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE',
        };
    }
  };

  const typeColors = getTypeColors();

  const handleButtonPress = (button: {text: string; onPress: () => void}) => {
    button.onPress();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss || buttons[0]?.onPress}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: cardColor,
              borderColor: typeColors.borderColor,
            },
          ]}>
          <View
            style={[
              styles.iconContainer,
              {backgroundColor: typeColors.bgColor},
            ]}>
            <MaterialIcons
              name={typeColors.icon as any}
              size={36}
              color={typeColors.iconColor}
            />
          </View>
          <Text style={[styles.title, {color: textColor}]}>{title}</Text>
          <Text style={[styles.message, {color: textColor}]}>{message}</Text>
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isDestructive && {
                      backgroundColor: '#EF4444',
                    },
                    isCancel && {
                      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                    },
                    !isDestructive && !isCancel && {
                      backgroundColor: primaryColor,
                    },
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.buttonText,
                      (isDestructive || (!isCancel && !isDestructive)) && {
                        color: '#FFFFFF',
                      },
                      isCancel && {
                        color: textColor,
                      },
                    ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backdropFilter: 'blur(4px)',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    opacity: 0.85,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

