import {Alert, Linking, NativeModules, PermissionsAndroid, Platform} from 'react-native';

type SmsNativeModule = {
  sendDirectSms: (phone: string, message: string) => Promise<boolean>;
};

const {SmsModule} = NativeModules as {SmsModule?: SmsNativeModule};

const SMS_PERMISSION = PermissionsAndroid.PERMISSIONS.SEND_SMS;

const ensureSmsPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS doesn't support direct SMS
  }

  if (!SMS_PERMISSION) {
    return true;
  }

  const alreadyGranted = await PermissionsAndroid.check(SMS_PERMISSION);
  if (alreadyGranted) {
    return true;
  }

  const status = await PermissionsAndroid.request(SMS_PERMISSION, {
    title: 'Allow SMS',
    message: 'Enable direct SMS sending for emergency alerts.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  return status === PermissionsAndroid.RESULTS.GRANTED;
};

const buildSmsUrl = (phone: string, message: string) => `sms:${phone}?body=${encodeURIComponent(message)}`;

export const sendSmsDirect = async (recipients: string[], message: string, forceDirect: boolean = false): Promise<boolean> => {
  if (recipients.length === 0) {
    console.warn('⚠️ No recipients provided for SMS');
    return false;
  }

  console.log(`📤 Attempting to send SMS to ${recipients.length} recipient(s), forceDirect=${forceDirect}`);

  // Try direct SMS sending first (Android only, requires permission)
  if (Platform.OS === 'android' && SmsModule?.sendDirectSms) {
    try {
      // Request permission first
      const hasPermission = await ensureSmsPermission();
      if (!hasPermission) {
        console.warn('⚠️ SMS permission denied');
        // For SOS (forceDirect=true), still try to open SMS app as fallback
        // This ensures SMS is sent even if permission is denied
        console.log('📱 Falling back to opening SMS app (permission denied)');
      } else {
        // Permission granted, send SMS directly
        try {
          await Promise.all(
            recipients.map((recipient) =>
              SmsModule.sendDirectSms(recipient.trim(), message),
            ),
          );
          console.log(`✅ Direct SMS sent to ${recipients.length} recipient(s) without opening app`);
          return true;
        } catch (directError) {
          console.warn('⚠️ Direct SMS send failed:', directError);
          // Even if direct send fails, try opening SMS app as fallback
          console.log('📱 Falling back to opening SMS app (direct send failed)');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error in SMS permission check or direct send:', error);
      // Fall through to open SMS app as fallback
    }
  }

  // Fallback: Open default SMS app (works on both Android and iOS)
  // For SOS, we always try this as a fallback to ensure SMS is sent
  try {
    const url = buildSmsUrl(recipients[0], message);
    console.log('📱 Opening SMS app with message...');
    await Linking.openURL(url);
    console.log('✅ SMS app opened successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to open SMS app:', error);
    Alert.alert('Unable to open SMS', 'Please try again or check your SMS permissions.');
    return false;
  }
};
