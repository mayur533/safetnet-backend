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

export const sendSmsDirect = async (recipients: string[], message: string): Promise<boolean> => {
  if (recipients.length === 0) {
    return false;
  }

  // Try direct SMS sending first (Android only, requires permission)
  if (Platform.OS === 'android' && SmsModule?.sendDirectSms) {
    try {
      // Request permission first
      const hasPermission = await ensureSmsPermission();
      if (!hasPermission) {
        console.warn('SMS permission denied, falling back to SMS app');
        // Fall through to open SMS app
      } else {
        // Permission granted, send SMS directly
        await Promise.all(
          recipients.map((recipient) =>
            SmsModule.sendDirectSms(recipient.trim(), message),
          ),
        );
        console.log(`✅ Direct SMS sent to ${recipients.length} recipient(s) without opening app`);
        return true;
      }
    } catch (error) {
      console.warn('Direct SMS send failed:', error);
      // Fall through to open SMS app
    }
  }

  // Fallback: Open default SMS app (works on both Android and iOS)
  try {
    const url = buildSmsUrl(recipients[0], message);
    await Linking.openURL(url);
    console.log('📱 Opened SMS app as fallback');
    return true;
  } catch (error) {
    Alert.alert('Unable to open SMS', 'Please try again or check your SMS permissions.');
    return false;
  }
};
