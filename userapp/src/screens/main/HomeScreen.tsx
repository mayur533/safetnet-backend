import React, {useState, useEffect, useRef} from 'react';
import {useRoute, useTheme} from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Vibration,
  Modal,
  Linking,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAuthStore} from '../../stores/authStore';
import {useSettingsStore} from '../../stores/settingsStore';
import {useContactStore} from '../../stores/contactStore';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {CustomVibration} from '../../modules/VibrationModule';
import {shakeDetectionService} from '../../services/shakeDetectionService';
import {dispatchSOSAlert} from '../../services/sosDispatcher';
import {ThemedAlert} from '../../components/common/ThemedAlert';

const COMMUNITY_MESSAGES = [
  'Suspicious activity near my location.',
  'Medical assistance needed urgently.',
  'Please check in, safety concern reported.',
];

const categoryCards = [
  {
    key: 'police',
    title: 'Police',
    icon: 'local-police',
    iconColor: '#1D4ED8',
    lightBackground: '#EFF6FF',
    lightBorder: '#DBEAFE',
    phone: '9561606066',
    smsBody: 'Emergency! Please send help immediately.',
    type: 'call' as const,
    isPremium: false,
  },
  {
    key: 'security',
    title: 'Security',
    icon: 'security',
    iconColor: '#047857',
    lightBackground: '#ECFDF5',
    lightBorder: '#A7F3D0',
    phone: '+18005550101',
    smsBody: 'Security alert needed. Please respond ASAP.',
    type: 'call' as const,
    isPremium: false,
  },
  {
    key: 'family',
    title: 'Family',
    icon: 'favorite',
    iconColor: '#7C3AED',
    lightBackground: '#F5F3FF',
    lightBorder: '#DDD6FE',
    phone: '+18005550123',
    smsBody: 'I need your help. Please call me back.',
    type: 'sms' as const,
    isPremium: false,
  },
  {
    key: 'community',
    title: 'Community',
    icon: 'groups',
    iconColor: '#B91C1C',
    lightBackground: '#FEF2F2',
    lightBorder: '#FECACA',
    phone: '+18005550999',
    smsBody: 'Alerting the community—please check in.',
    type: 'community' as const,
          contacts: [], // Will be loaded from API
    quickMessages: COMMUNITY_MESSAGES,
    isPremium: false, // Free users get 500m radius
  },
  {
    key: 'ambulance',
    title: 'Ambulance',
    icon: 'local-hospital',
    iconColor: '#DC2626',
    lightBackground: '#FEE2E2',
    lightBorder: '#FCA5A5',
    phone: '108',
    smsBody: 'Medical emergency. Please dispatch assistance immediately.',
    type: 'call' as const,
    isPremium: false,
  },
  {
    key: 'location',
    title: 'Share\nLocation',
    icon: 'my-location',
    iconColor: '#0EA5E9',
    lightBackground: '#E0F2FE',
    lightBorder: '#BAE6FD',
    phone: '+18005550155',
    smsBody: 'Here is my current location. Please monitor me closely.',
    type: 'sms' as const,
    isPremium: false, // Free users get 30min limit
  },
];

type CategoryCard = typeof categoryCards[number];

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}: any) => {
  const route = useRoute();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {isPremium} = useSubscription();
  const shakeToSendSOS = useSettingsStore((state) => state.shakeToSendSOS);
  const theme = useTheme();
  const colors = theme.colors;
  
  // Theme-dependent colors
  const isDarkMode = theme.dark || false;
  const cardShadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)';
  const mutedTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : '#6B7280';
  const subtleTextColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#9CA3AF';
  const softSurface = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6';
  const inputSurface = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F9FAFB';
  const placeholderColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#9CA3AF';
  // Helper function to add alpha to colors
  const withAlpha = (color: string, alpha: number): string => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/g, `${alpha})`);
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    return color;
  };
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'success' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [actionCard, setActionCard] = useState<CategoryCard | null>(null);
  const [customFamilyMessage, setCustomFamilyMessage] = useState('');
  const [selectedCommunityContact, setSelectedCommunityContact] = useState<any>(null);
  const [communityContacts, setCommunityContacts] = useState<any[]>([]);
  const [selectedQuickMessage, setSelectedQuickMessage] = useState(COMMUNITY_MESSAGES[0]);
  const [customCommunityMessage, setCustomCommunityMessage] = useState(COMMUNITY_MESSAGES[0]);

  const cardRows: CategoryCard[][] = [];
  for (let i = 0; i < categoryCards.length; i += 2) {
    cardRows.push(categoryCards.slice(i, i + 2));
  }

  // Check route params for showLoginModal
  useEffect(() => {
    if (route?.params?.showLoginModal) {
      setShowLoginModal(true);
      // Clear the param after showing modal
      navigation.setParams({showLoginModal: undefined});
    }
  }, [route?.params?.showLoginModal, navigation]);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownAnim = useRef(new Animated.Value(1)).current;

  // Permissions are now handled automatically by the system on app start

  const triggerVibration = (duration: number = 200) => {
    try {
      // Use custom vibration module that uses USAGE_NOTIFICATION instead of USAGE_TOUCH
      // This ensures vibrations work even when touch vibrations are disabled
      // Use shorter duration (200ms) for discrete pulses that stop between vibrations
      CustomVibration.vibrate(duration);
    } catch (err) {
      console.error('Vibration error:', err);
      // Fallback to React Native's Vibration API
      try {
        Vibration.vibrate(duration);
      } catch (e) {
        console.error('Vibration fallback failed:', e);
      }
    }
  };

  const handleSOSPressIn = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    
    setIsButtonPressed(true);
    // Start countdown immediately when button is pressed
      startAlertSequence();
  };

  const handleSOSPressOut = () => {
    // Cancel countdown if user releases button before countdown completes
    if (isSendingAlert && countdown !== null && countdown > 0) {
      // Cancel the alert sequence
      if (alertTimerRef.current) {
        clearInterval(alertTimerRef.current);
        alertTimerRef.current = null;
    }
      resetState();
      return;
    }
    
    // Clear haptic interval
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    
    // Only cancel if not already in alert sequence
    if (!isSendingAlert) {
      setIsButtonPressed(false);
      setCountdown(null);
    }
  };

  const startAlertSequence = () => {
    // Clear any existing timers
    if (alertTimerRef.current) {
      clearInterval(alertTimerRef.current);
      alertTimerRef.current = null;
    }
    
    setIsSendingAlert(true);
    setCountdown(3);
    
    // Haptic feedback on initial press
    triggerVibration(200);
    
    // Start alert sending countdown (3 to 1, then 0 triggers send)
    alertTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev === undefined) {
          return 3;
        }
        
        // Haptic feedback on countdown number change
        triggerVibration(200);
        
        // Animate countdown
        Animated.sequence([
          Animated.timing(countdownAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(countdownAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        
        if (prev <= 1) {
          // Clear interval first
          if (alertTimerRef.current) {
            clearInterval(alertTimerRef.current);
            alertTimerRef.current = null;
          }
          // Send alert after showing "1" briefly
          setTimeout(() => {
            sendAlert();
          }, 500);
          return 0;
        }
        
        return prev - 1;
      });
    }, 1000);
  };

  const sendAlert = async (fromShake: boolean = false) => {
    if (!isAuthenticated) {
      return;
    }

    // If called from shake detection, send alert directly without UI countdown
    // Vibration and notification are already handled in shakeDetectionService
    if (fromShake) {
      try {
        const sosMessage = useSettingsStore.getState().sosMessageTemplate || 'Emergency SOS alert! Please help immediately.';
        await dispatchSOSAlert(sosMessage);
        console.log('SOS alert sent from shake detection');
        // Notification and vibration already handled by shakeDetectionService
      } catch (error) {
        console.error('Error dispatching SOS alert from shake:', error);
        setAlertState({
          visible: true,
          title: 'Error',
          message: 'Failed to send SOS alert. Please try again.',
          type: 'error',
        });
      }
      return;
    }

    // Normal UI flow - dispatch SOS alert
    try {
      const sosMessage = useSettingsStore.getState().sosMessageTemplate || 'Emergency SOS alert! Please help immediately.';
      await dispatchSOSAlert(sosMessage);
      
      // Check if family contacts exist to show appropriate message
      const {contacts} = useContactStore.getState();
      const hasFamilyContacts = contacts.length > 0;
      
      // Show success screen after alert is sent
    setShowSuccess(true);
      setIsSendingAlert(false);
      setShowSuccessScreen(true);
    } catch (error) {
      console.error('Error dispatching SOS alert:', error);
      setAlertState({
        visible: true,
        title: 'Error',
        message: 'Failed to send SOS alert. Please try again.',
        type: 'error',
      });
      resetState();
      return;
    }
    // Haptic feedback when alert is sent - use pattern for success
    try {
      // On Android: odd indices = vibration duration, even indices = separation time
      // Pattern: wait 0ms, vibrate 1000ms, wait 200ms, vibrate 1000ms
      CustomVibration.vibratePattern([0, 1000, 200, 1000], -1);
    } catch (err) {
      console.warn('Vibration pattern error:', err);
      // Fallback to simple vibration
      CustomVibration.vibrate(1000);
    }
  };

  const resetState = () => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setIsButtonPressed(false);
    setIsSendingAlert(false);
    setShowSuccess(false);
    setShowSuccessScreen(false);
    setCountdown(null);
    countdownAnim.setValue(1);
  };

  const handleBackFromSuccess = () => {
    resetState();
  };


  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const {loadSettings} = useSettingsStore.getState();
      await loadSettings();
    };
    loadSettings();
  }, []);

  // Shake detection setup
  useEffect(() => {
    if (shakeToSendSOS && isAuthenticated) {
      // Start shake detection
      shakeDetectionService.start(() => {
        // This callback is called when shake is detected
        sendAlert(true); // Pass true to indicate it's from shake
      });
    } else {
      // Stop shake detection only if setting is disabled
      if (!shakeToSendSOS) {
        shakeDetectionService.stop();
      }
    }

    // Cleanup on unmount or when settings change
    return () => {
      // Don't stop if setting is enabled - let it run in background
      if (!shakeToSendSOS) {
        shakeDetectionService.stop();
      }
    };
  }, [shakeToSendSOS, isAuthenticated]);

  useEffect(() => {
    // Test vibration on component mount after a short delay
    const testTimer = setTimeout(() => {
      try {
        CustomVibration.vibrate(500);
      } catch (err) {
        console.error('Vibration test failed:', err);
      }
    }, 1000);
    
    return () => {
      clearTimeout(testTimer);
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
      if (alertTimerRef.current) {
        clearInterval(alertTimerRef.current);
      }
    };
  }, []);

  const handleCardPress = (card: CategoryCard) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    // Check if premium feature and user is not premium
    if (card.isPremium && !isPremium) {
      setAlertState({
        visible: true,
        title: 'Premium Feature',
        message: 'This feature is available for Premium users only. Upgrade to Premium to unlock this feature.',
        type: 'info',
      });
      return;
    }

    triggerVibration(200);

    if (card.type === 'community') {
      const initialMessage = card.quickMessages?.[0] || '';
      if (card.contacts && card.contacts.length > 0) {
      setSelectedCommunityContact(card.contacts[0]);
      }
      setSelectedQuickMessage(initialMessage);
      setCustomCommunityMessage(initialMessage);
    } else if (card.type === 'sms') {
      setCustomFamilyMessage(card.smsBody || '');
    }

    setActionCard(card);
  };

  const showCategories = !isButtonPressed && !isSendingAlert && !showSuccess;

  const closeActionModal = () => {
    setActionCard(null);
  };

  const handleCall = async (phone?: string) => {
    if (!phone) {
      closeActionModal();
      return;
    }

    // System will handle permission automatically if not granted
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (error) {
      console.warn('Failed to initiate call:', error);
      setAlertState({
        visible: true,
        title: 'Call Failed',
        message: 'Unable to place the call. Please try again from your dialer.',
        type: 'error',
      });
    } finally {
      closeActionModal();
    }
  };

  const handleSendSMS = (phone?: string, message?: string) => {
    if (phone) {
      const body = message ? `?body=${encodeURIComponent(message)}` : '';
      Linking.openURL(`sms:${phone}${body}`).catch(() => {});
    }
    closeActionModal();
  };

  const handleSendCommunityMessage = () => {
    const message = customCommunityMessage.trim() || selectedQuickMessage;
    if (selectedCommunityContact && selectedCommunityContact.phone) {
    handleSendSMS(selectedCommunityContact.phone, message);
    } else {
      setAlertState({
        visible: true,
        title: 'No Contact Selected',
        message: 'Please select a community contact first.',
        type: 'error',
      });
    }
  };

  const renderActionContent = () => {
    if (!actionCard) {
      return null;
    }

    const cancelButtonStyle = [
      styles.modalButton,
      {
        backgroundColor: softSurface,
        borderColor: withAlpha(colors.border, isDarkMode ? 0.7 : 1),
      },
    ];

    const cancelButtonTextStyle = [styles.modalCancelText, {color: colors.text}];

    const primaryButtonStyle = [
      styles.modalButton,
      {backgroundColor: colors.primary, borderColor: colors.primary},
    ];

    if (actionCard.type === 'call') {
      return (
        <>
          <View style={styles.actionHeader}>
            <MaterialIcons name={actionCard.icon} size={32} color={actionCard.iconColor} />
            <Text style={[styles.actionTitle, {color: colors.text}]}>{actionCard.title}</Text>
          </View>
          <Text style={[styles.actionDescription, {color: mutedTextColor}]}>Are you sure you want to call {actionCard.title.toLowerCase()} at {actionCard.phone}?</Text>
          <View style={styles.actionButtonRow}>
            <TouchableOpacity style={cancelButtonStyle} onPress={closeActionModal} activeOpacity={0.7}>
              <Text style={cancelButtonTextStyle}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={primaryButtonStyle}
              onPress={() => {
                void handleCall(actionCard.phone);
              }}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (actionCard.type === 'sms') {
      return (
        <>
          <View style={styles.actionHeader}>
            <MaterialIcons name={actionCard.icon} size={32} color={actionCard.iconColor} />
            <Text style={[styles.actionTitle, {color: colors.text}]}>{actionCard.title}</Text>
          </View>
          <Text style={[styles.actionDescription, {color: mutedTextColor}]}>Send a quick update to your family contact.</Text>
          <TextInput
            style={[
              styles.actionInput,
              {
                backgroundColor: inputSurface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            multiline
            numberOfLines={3}
            value={customFamilyMessage}
            onChangeText={setCustomFamilyMessage}
            placeholder="Type your emergency message"
            placeholderTextColor={placeholderColor}
          />
          <View style={styles.actionButtonRow}>
            <TouchableOpacity style={cancelButtonStyle} onPress={closeActionModal} activeOpacity={0.7}>
              <Text style={cancelButtonTextStyle}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={primaryButtonStyle}
              onPress={() => handleSendSMS(actionCard.phone, customFamilyMessage.trim() || actionCard.smsBody)}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (actionCard.type === 'community') {
      return (
        <>
          <View style={styles.actionHeader}>
            <MaterialIcons name={actionCard.icon} size={32} color={actionCard.iconColor} />
            <Text style={[styles.actionTitle, {color: colors.text}]}>{actionCard.title}</Text>
          </View>
          <Text style={[styles.actionDescription, {color: mutedTextColor}]}>Choose a circle to alert.</Text>
          <View style={styles.chipRow}>
            {actionCard.contacts && actionCard.contacts.length > 0 ? (
              actionCard.contacts.map((contact) => {
                const isActive = selectedCommunityContact && contact.id === selectedCommunityContact.id;
              return (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: softSurface,
                      borderColor: withAlpha(colors.border, isDarkMode ? 0.7 : 1),
                    },
                    isActive && {backgroundColor: colors.primary, borderColor: colors.primary},
                  ]}
                  onPress={() => {
                    setSelectedCommunityContact(contact);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.chipText,
                      {color: mutedTextColor},
                      isActive && {color: isDarkMode ? colors.background : '#FFFFFF'},
                    ]}>
                    {contact.label}
                  </Text>
                </TouchableOpacity>
              );
              })
            ) : (
              <Text style={[styles.emptyContactsText, {color: mutedTextColor}]}>
                No community contacts available
              </Text>
            )}
          </View>
          <Text style={[styles.actionDescription, {marginTop: 12, color: mutedTextColor}]}>Quick messages</Text>
          <View style={styles.chipRow}>
            {actionCard.quickMessages.map((message) => {
              const isActive = message === selectedQuickMessage;
              return (
                <TouchableOpacity
                  key={message}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: softSurface,
                      borderColor: withAlpha(colors.border, isDarkMode ? 0.7 : 1),
                    },
                    isActive && {backgroundColor: colors.primary, borderColor: colors.primary},
                  ]}
                  onPress={() => {
                    setSelectedQuickMessage(message);
                    setCustomCommunityMessage(message);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.chipText,
                      {color: mutedTextColor},
                      isActive && {color: isDarkMode ? colors.background : '#FFFFFF'},
                    ]}>
                    {message}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[
              styles.actionInput,
              {
                marginTop: 12,
                backgroundColor: inputSurface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            multiline
            numberOfLines={3}
            value={customCommunityMessage}
            onChangeText={(text) => {
              setCustomCommunityMessage(text);
              setSelectedQuickMessage(text);
            }}
            placeholder="Custom message to your community"
            placeholderTextColor={placeholderColor}
          />
          <View style={styles.actionButtonRow}>
            <TouchableOpacity style={cancelButtonStyle} onPress={closeActionModal} activeOpacity={0.7}>
              <Text style={cancelButtonTextStyle}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={primaryButtonStyle}
              onPress={handleSendCommunityMessage}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}> 
      {/* Top SOS Section */}
      <View style={styles.sosSection}>
        {/* Fixed position SOS Button */}
        <TouchableOpacity
          style={[
            styles.sosButton,
            {
              borderColor: colors.border,
              shadowColor: cardShadowColor,
            },
          ]}
          onPressIn={handleSOSPressIn}
          onPressOut={handleSOSPressOut}
          activeOpacity={0.8}
          disabled={showSuccess}>
          <Animated.Text
            style={[
              styles.sosText,
              {
                transform: [{scale: isSendingAlert && countdown !== null ? countdownAnim : 1}],
              },
            ]}>
            SOS
          </Animated.Text>
        </TouchableOpacity>

        {/* Fixed position text container below button */}
        <View style={styles.messageContainer}>
          {!isSendingAlert && !showSuccess && !isButtonPressed && (
            <Text style={[styles.instructionText, {color: colors.text}]}>Press and hold to send an alert.</Text>
          )}

          {isSendingAlert && !showSuccess && countdown !== null && countdown > 0 && (
            <>
              <Text style={[styles.countdownLabel, {color: colors.text}]}>
                SOS will be sent in
            </Text>
              <Animated.Text 
                style={[
                  styles.countdownNumber, 
                  {color: '#B91C1C'},
                  {
                    transform: [{scale: countdownAnim}],
                  }
                ]}>
                {countdown}
              </Animated.Text>
            </>
          )}
          
          {isSendingAlert && !showSuccess && countdown === 0 && (
            <Text style={[styles.alertMessageText, {color: '#B91C1C'}]}>Sending alert...</Text>
          )}
        </View>
      </View>


      {/* Success Screen Modal */}
      {showSuccessScreen && (
        <Modal
          visible={showSuccessScreen}
          transparent={false}
          animationType="fade"
          onRequestClose={handleBackFromSuccess}>
          <View style={[styles.successScreenContainer, {backgroundColor: colors.background}]}>
            <View style={styles.successScreenContent}>
              <View style={[styles.successIconContainer, {backgroundColor: '#ECFDF5'}]}>
                <MaterialIcons name="check-circle" size={80} color="#10B981" />
              </View>
              <Text style={[styles.successScreenTitle, {color: colors.text}]}>
                SOS Alert Sent
              </Text>
              <Text style={[styles.successScreenMessage, {color: colors.text}]}>
                Your SOS alert has been sent successfully.
              </Text>
              {(() => {
                const {contacts} = useContactStore.getState();
                const hasFamilyContacts = contacts.length > 0;
                
                if (!hasFamilyContacts) {
                  return (
                    <>
                      <Text style={[styles.successScreenSubMessage, {color: mutedTextColor}]}>
                        Since you don't have family contacts added, your SOS has been sent to:
                      </Text>
                      <View style={styles.recipientList}>
                        <View style={styles.recipientItem}>
                          <MaterialIcons name="local-police" size={20} color={colors.primary} />
                          <Text style={[styles.recipientText, {color: colors.text}]}>Police</Text>
            </View>
                        <View style={styles.recipientItem}>
                          <MaterialIcons name="security" size={20} color={colors.primary} />
                          <Text style={[styles.recipientText, {color: colors.text}]}>Security Officer</Text>
        </View>
      </View>
                      <Text style={[styles.successScreenHelpText, {color: mutedTextColor}]}>
                        Help is on the way. Stay calm and wait for assistance.
                      </Text>
                    </>
                  );
                } else {
                  return (
                    <>
                      <Text style={[styles.successScreenSubMessage, {color: mutedTextColor}]}>
                        Help is on the way. Your family contacts and emergency services have been notified.
                      </Text>
                      <Text style={[styles.successScreenHelpText, {color: mutedTextColor}]}>
                        Stay calm and wait for assistance. Your location has been shared with responders.
                      </Text>
                    </>
                  );
                }
              })()}
              <TouchableOpacity
                style={[styles.backButton, {backgroundColor: colors.primary}]}
                onPress={handleBackFromSuccess}
                activeOpacity={0.8}>
                <Text style={styles.backButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Categories Section - Hide when countdown or alert is active */}
      {showCategories && (
        <View style={styles.categoriesSection}>
          {cardRows.map((rowCards, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {rowCards.map((card) => (
                <TouchableOpacity
                  key={card.key}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isDarkMode ? withAlpha(card.iconColor, 0.15) : card.lightBackground,
                      borderColor: isDarkMode ? withAlpha(card.iconColor, 0.35) : card.lightBorder,
                      shadowColor: cardShadowColor,
                    },
                  ]}
                  onPress={() => handleCardPress(card)}
                  activeOpacity={0.85}>
                  <View
                    style={[
                      styles.cardIconContainer,
                      {
                        backgroundColor: isDarkMode
                          ? withAlpha(card.iconColor, 0.25)
                          : 'rgba(255,255,255,0.75)',
                      },
                    ]}>
                    <MaterialIcons name={card.icon} size={20} color={card.iconColor} />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={[styles.cardTitle, {color: colors.text}]}>{card.title}</Text>
                    {card.isPremium && !isPremium && (
                      <View style={styles.premiumBadge}>
                        <MaterialIcons name="workspace-premium" size={12} color="#F59E0B" />
                        <Text style={styles.premiumBadgeText}>Premium</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {rowCards.length < 2 && <View style={{width: CARD_WIDTH}} />}
            </View>
          ))}
        </View>
      )}

      {/* Footer with Logo - Hide when countdown or alert is active */}
      {showCategories && (
        <View style={styles.footer}>
          <MaterialIcons name="security" size={20} color={colors.notification} />
          <Text style={[styles.footerText, {color: colors.notification}]}>Safe T Net</Text>
        </View>
      )}

      <Modal
        visible={actionCard !== null}
        transparent
        animationType="fade"
        onRequestClose={closeActionModal}>
        <View style={[styles.actionOverlay, {backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'}]}>
          <View style={[styles.actionContainer, {backgroundColor: colors.card, borderColor: colors.border}]}>{renderActionContent()}</View>
        </View>
      </Modal>

      {/* Modern Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}>
        <View style={[styles.modalOverlay, {backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'}]}>
          <View style={[styles.modalContent, {backgroundColor: colors.card, borderColor: colors.border}]}>
            <View
              style={[
                styles.modalIconContainer,
                {backgroundColor: withAlpha(colors.primary, isDarkMode ? 0.2 : 0.1)},
              ]}>
              <MaterialIcons name="lock" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Login Required</Text>
            <Text style={[styles.modalMessage, {color: colors.notification}]}>Login to use this feature</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelButton,
                  {
                    backgroundColor: softSurface,
                    borderColor: withAlpha(colors.border, isDarkMode ? 0.7 : 1),
                  },
                ]}
                onPress={() => setShowLoginModal(false)}
                activeOpacity={0.7}>
                <Text style={[styles.modalCancelText, {color: colors.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLoginButton, {backgroundColor: colors.primary}]}
                onPress={async () => {
                  setShowLoginModal(false);
                  // Navigate to Login screen by clearing auth state
                  // This will switch to AuthNavigator which starts at Login screen
                  const {logout} = useAuthStore.getState();
                  await logout();
                }}
                activeOpacity={0.7}>
                <Text style={styles.modalLoginText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Themed Alert Modal */}
      <ThemedAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={[
          {
            text: 'OK',
            onPress: () => setAlertState({...alertState, visible: false}),
          },
        ]}
        onDismiss={() => setAlertState({...alertState, visible: false})}
      />
    </View>
  );
};

const CARD_HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;
const CARD_WIDTH = (width - CARD_HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  sosSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 60,
  },
  sosButton: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: (width * 0.5) / 2,
    backgroundColor: '#B91C1C',
    borderWidth: 4,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  messageContainer: {
    width: '100%',
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#374151',
    fontSize: 16,
    textAlign: 'center',
  },
  successMessageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  alertMessageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B91C1C',
    textAlign: 'center',
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  successContainer: {
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  successScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successScreenContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successScreenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  successScreenMessage: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  successScreenSubMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  successScreenHelpText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  recipientList: {
    marginVertical: 16,
    gap: 12,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 10,
  },
  recipientText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesSection: {
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    paddingBottom: 32,
    gap: CARD_GAP,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  categoryCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 2.5,
    elevation: 2,
    minHeight: 88,
  },
  cardIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 16,
    flexShrink: 1,
  },
  actionOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  actionDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionInput: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
  },
  footerText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: -0.2,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalLoginButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  modalLoginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
