import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {useAVRecorderStore} from '../stores/avRecorderStore';

const ensureMicrophonePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  if (!permission) {
    return true;
  }
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return true;
  }
  const result = await PermissionsAndroid.request(permission, {
    title: 'Allow microphone access',
    message: 'We use the microphone to capture audio evidence during SOS events.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const startEvidenceRecording = async (durationSeconds = 90) => {
  const store = useAVRecorderStore.getState();
  if (store.isRecording) {
    return;
  }
  const permitted = await ensureMicrophonePermission();
  if (!permitted) {
    Alert.alert(
      'Microphone permission required',
      'Enable microphone access in system settings to record audio evidence during SOS.',
    );
    return;
  }
  store.start(durationSeconds);
};

export const stopEvidenceRecording = () => {
  useAVRecorderStore.getState().stop();
};

export const clearEvidenceClips = () => {
  useAVRecorderStore.getState().clear();
};


