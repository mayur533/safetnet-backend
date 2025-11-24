import {Alert, Linking, NativeModules, PermissionsAndroid, Platform} from 'react-native';

const CALL_PERMISSION = PermissionsAndroid.PERMISSIONS.CALL_PHONE;

const ensureCallPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (!CALL_PERMISSION) {
    return true;
  }

  const alreadyGranted = await PermissionsAndroid.check(CALL_PERMISSION);
  if (alreadyGranted) {
    return true;
  }

  const status = await PermissionsAndroid.request(CALL_PERMISSION, {
    title: 'Allow phone calls',
    message: 'Enable direct calling for emergency contacts.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  return status === PermissionsAndroid.RESULTS.GRANTED;
};

const directCallModule = NativeModules.DirectCallModule as
  | {startDirectCall(phoneNumber: string): Promise<boolean>}
  | undefined;

export const requestDirectCall = async (phoneNumber: string): Promise<void> => {
  if (!phoneNumber) {
    throw new Error('Missing phone number');
  }

  const hasPermission = await ensureCallPermission();
  if (!hasPermission) {
    throw new Error('Call permission denied');
  }

  if (Platform.OS === 'android' && directCallModule?.startDirectCall) {
    try {
      await directCallModule.startDirectCall(phoneNumber);
      return;
    } catch (error) {
      console.warn('Direct call module failed, falling back to dialer:', error);
    }
  }

  const sanitized = phoneNumber.replace(/\s+/g, '');
  const url = `tel:${sanitized}`;
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    throw new Error('Calling is not supported on this device');
  }

  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert('Call failed', 'Unable to place the call. Please try again.');
    throw error;
  }
};


