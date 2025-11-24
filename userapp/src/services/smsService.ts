import {Alert, Linking, NativeModules, Platform} from 'react-native';

type SmsNativeModule = {
  sendDirectSms: (phone: string, message: string) => Promise<boolean>;
};

const {SmsModule} = NativeModules as {SmsModule?: SmsNativeModule};

const buildSmsUrl = (phone: string, message: string) => `sms:${phone}?body=${encodeURIComponent(message)}`;

export const sendSmsDirect = async (recipients: string[], message: string): Promise<boolean> => {
  if (recipients.length === 0) {
    return false;
  }

  if (Platform.OS === 'android' && SmsModule?.sendDirectSms) {
    try {
      await Promise.all(
        recipients.map((recipient) =>
          SmsModule.sendDirectSms(recipient.trim(), message),
        ),
      );
      return true;
    } catch (error) {
      console.warn('Direct SMS send failed', error);
      Alert.alert(
        'SMS sending failed',
        'We could not send the message automatically. We will open your SMS app instead.',
      );
    }
  }

  try {
    const url = buildSmsUrl(recipients[0], message);
    await Linking.openURL(url);
    return true;
  } catch (error) {
    Alert.alert('Unable to open SMS', 'Please try again or check your SMS permissions.');
    return false;
  }
};
