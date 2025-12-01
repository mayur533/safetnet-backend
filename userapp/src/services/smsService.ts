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
        // If forceDirect=true, don't fall back to opening SMS app - return false
        if (forceDirect) {
          console.error('❌ Cannot send SMS directly: permission denied. forceDirect=true prevents fallback.');
          return false;
        }
        // Only fall back to SMS app if forceDirect=false
        console.log('📱 Falling back to opening SMS app (permission denied)');
      } else {
        // Permission granted, send SMS directly
        try {
          console.log(`📱 Native SMS module available, sending to ${recipients.length} recipient(s)...`);
          const results = await Promise.allSettled(
            recipients.map((recipient) => {
              const trimmedPhone = recipient.trim();
              console.log(`📱 Attempting to send SMS to: ${trimmedPhone}`);
              return SmsModule.sendDirectSms(trimmedPhone, message);
            }),
          );
          
          // Check if all SMS were sent successfully
          const allSuccessful = results.every(
            (result) => result.status === 'fulfilled' && result.value === true
          );
          
          if (allSuccessful) {
            console.log(`✅ Direct SMS sent successfully to ${recipients.length} recipient(s) without opening app`);
            // NOTE: Native module returns success immediately, but SMS might not actually be sent
            // Android's sendTextMessage is async and doesn't confirm delivery
            // The native module can't verify if SMS was actually sent
            // Return true to indicate attempt was made, but user should verify in SMS app
            return true;
          } else {
            // Some SMS failed
            const failedResults = results.filter(
              (result) => result.status === 'rejected' || (result.status === 'fulfilled' && result.value !== true)
            );
            console.error(`❌ Failed to send SMS to ${failedResults.length} recipient(s):`, failedResults);
            console.error(`❌ Failed results details:`, failedResults.map(r => ({
              status: r.status,
              value: r.status === 'fulfilled' ? r.value : undefined,
              reason: r.status === 'rejected' ? r.reason : undefined,
            })));
            
            // If forceDirect=true, don't fall back - return false
            if (forceDirect) {
              console.error('❌ Cannot send SMS directly: some sends failed. forceDirect=true prevents fallback.');
              return false;
            }
            // Only fall back to SMS app if forceDirect=false
            // Return false so caller can handle fallback
            console.log('📱 Some SMS sends failed, returning false for caller to handle fallback');
            return false;
          }
        } catch (directError: any) {
          console.error('⚠️ Direct SMS send failed with error:', directError);
          console.error('Error details:', {
            message: directError?.message,
            code: directError?.code,
            name: directError?.name,
          });
          // If forceDirect=true, don't fall back to opening SMS app - return false
          if (forceDirect) {
            console.error('❌ Cannot send SMS directly: send failed. forceDirect=true prevents fallback.');
            return false;
          }
          // Only fall back to SMS app if forceDirect=false
          console.log('📱 Falling back to opening SMS app (direct send failed)');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error in SMS permission check or direct send:', error);
      // If forceDirect=true, don't fall back - return false
      if (forceDirect) {
        console.error('❌ Cannot send SMS directly: error occurred. forceDirect=true prevents fallback.');
        return false;
      }
      // Only fall through to open SMS app if forceDirect=false
    }
  } else if (forceDirect) {
    // If forceDirect=true but direct SMS is not available, return false
    console.error('❌ Direct SMS not available (iOS or native module missing). forceDirect=true prevents fallback.');
    return false;
  }

  // Fallback: Open default SMS app (only if forceDirect=false)
  // For SOS (forceDirect=true), we don't use this fallback - we only send directly
  if (!forceDirect) {
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
  }

  // If we reach here with forceDirect=true, it means direct SMS failed and we can't fall back
  return false;
};
