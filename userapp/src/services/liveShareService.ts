import Geolocation, {GeolocationResponse} from '@react-native-community/geolocation';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import {useContactStore} from '../stores/contactStore';
import {useLiveShareStore} from '../stores/liveShareStore';
import {sendSmsDirect} from './smsService';

const ensureLocationPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  if (!permission) {
    return true;
  }
  try {
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) {
      return true;
    }
    const status = await PermissionsAndroid.request(permission, {
      title: 'Allow location access',
      message: 'Location access is required to share your live location with trusted contacts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return status === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn('Live share permission request failed', error);
    return false;
  }
};

const getCurrentPosition = () =>
  new Promise<GeolocationResponse>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );
  });

const buildMapsLink = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

export const startLiveShareSession = async (durationMinutes: number) => {
  const contacts = useContactStore.getState().contacts.filter((contact) => contact.phone?.trim());
  if (contacts.length === 0) {
    Alert.alert(
      'No contacts yet',
      'Add at least one emergency contact before sharing your live location.',
    );
    return false;
  }

  const hasPermission = await ensureLocationPermission();
  if (!hasPermission) {
    Alert.alert(
      'Location required',
      'Location access is needed to share where you are with your trusted contacts.',
    );
    return false;
  }

  try {
    const {coords} = await getCurrentPosition();
    const link = buildMapsLink(coords.latitude, coords.longitude);
    const message = `I'm sharing my live location for the next ${durationMinutes} minutes. Track me here: ${link}`;
    const phoneNumbers = contacts.map((contact) => contact.phone.trim()).filter(Boolean);

    let smsSent = false;
    if (Platform.OS === 'android') {
      smsSent = await sendSmsDirect(phoneNumbers, message);
    }

    if (!smsSent) {
      try {
        await Linking.openURL(`sms:${phoneNumbers.join(',')}?body=${encodeURIComponent(message)}`);
      } catch (error) {
        console.warn('Failed to open SMS composer for live share', error);
      }
    }

    await useLiveShareStore
      .getState()
      .startSession({
        startedAt: Date.now(),
        durationMinutes,
        initialLocation: {latitude: coords.latitude, longitude: coords.longitude},
      });
    return true;
  } catch (error) {
    console.warn('Unable to start live share session', error);
    Alert.alert('Location unavailable', 'We could not determine your current location. Please try again.');
    return false;
  }
};

export const stopLiveShareSession = async () => {
  await useLiveShareStore.getState().stopSession();
};



