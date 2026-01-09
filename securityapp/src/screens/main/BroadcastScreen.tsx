import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors, spacing, typography } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const BroadcastScreen = ({ navigation }: any) => {
  const officer = useAppSelector((state) => state.auth.officer);
  const [message, setMessage] = useState('I need help, someone following me');
  const [alertType, setAlertType] = useState<'general' | 'warning' | 'emergency'>('general');
  const [isLoading, setIsLoading] = useState(false);

  const alertTypes = [
    { key: 'general' as const, label: 'General Notice', icon: 'notifications', color: colors.infoBlue },
    { key: 'warning' as const, label: 'Warning', icon: 'warning', color: colors.warningOrange },
    { key: 'emergency' as const, label: 'Emergency', icon: 'emergency', color: colors.emergencyRed },
  ];

  const quickTemplates = [
    {
      id: 'suspicious',
      label: 'Suspicious activity',
      message: '⚠️ ALERT: Suspicious activity detected in the area. All personnel please remain vigilant and report any unusual behavior immediately.',
    },
    {
      id: 'secured',
      label: 'Area secured',
      message: '✅ UPDATE: Area has been secured and verified. Normal operations can resume. All clear for regular activities.',
    },
    {
      id: 'shift',
      label: 'Shift change',
      message: '📋 NOTICE: Shift change in progress. Incoming team is taking over patrol duties. All personnel please coordinate handover.',
    },
  ];

  const handleTemplateSelect = (template: typeof quickTemplates[0]) => {
    setMessage(template.message);
    setSelectedTemplate(template.id);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!officer) {
      Alert.alert('Error', 'Officer information not found');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Success',
        'Broadcast message sent successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send broadcast message');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAlertType = alertTypes.find(type => type.key === alertType);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broadcast Alert</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Alert Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Type</Text>
          <View style={styles.alertTypeContainer}>
            {alertTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.alertTypeButton,
                  alertType === type.key && { backgroundColor: type.color, borderColor: type.color }
                ]}
                onPress={() => setAlertType(type.key)}
                activeOpacity={0.7}
              >
                <Icon
                  name={type.icon}
                  size={20}
                  color={alertType === type.key ? colors.white : type.color}
                />
                <Text
                  style={[
                    styles.alertTypeText,
                    alertType === type.key && styles.alertTypeTextSelected
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Templates</Text>
          <View style={styles.templatesContainer}>
            {quickTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateButton}
                onPress={() => setMessage(template.message)}
                activeOpacity={0.7}
              >
                <Text style={styles.templateLabel}>{template.label}</Text>
                <Icon name="chevron-right" size={20} color={colors.mediumGray} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Enter your broadcast message..."
            placeholderTextColor={colors.mediumGray}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {message.length}/500 characters
          </Text>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Icon name="send" size={20} color={colors.white} />
          <Text style={styles.sendButtonText}>
            {isLoading ? 'Sending...' : 'Send Broadcast'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: 50,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
    fontSize: 18,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: spacing.base,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.cardTitle,
    marginBottom: spacing.md,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  alertTypeText: {
    ...typography.buttonMedium,
    color: colors.darkText,
    marginLeft: spacing.xs,
  },
  alertTypeTextSelected: {
    color: colors.white,
  },
  templatesContainer: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 8,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  templateLabel: {
    ...typography.body,
    color: colors.darkText,
    flex: 1,
  },
  messageInput: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.darkText,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  charCount: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    ...typography.buttonLarge,
    color: colors.white,
    marginLeft: spacing.sm,
  },
});