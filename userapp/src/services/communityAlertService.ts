import {Alert, Platform, ToastAndroid} from 'react-native';
import {useContactStore} from '../stores/contactStore';
import {sendSmsDirect} from './smsService';
import {useCommunityAlertStore} from '../stores/communityAlertStore';

export interface CommunityAlertInput {
  message: string;
  radiusMeters: number;
}

const showFeedback = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('Community Alert', message);
  }
};

export const broadcastCommunityAlert = async ({message, radiusMeters}: CommunityAlertInput) => {
  const contacts = useContactStore
    .getState()
    .contacts.filter((contact) => contact.phone?.trim())
    .map((contact) => contact.phone.trim());

  if (contacts.length === 0) {
    Alert.alert(
      'Add contacts first',
      'Community alerts need at least one trusted contact with a phone number.',
    );
    return false;
  }

  const formattedMessage = `[Community Alert ~${Math.round(radiusMeters / 100)}m] ${message}`;
  const sent = await sendSmsDirect(contacts, formattedMessage);

  await useCommunityAlertStore
    .getState()
    .addAlert({message: formattedMessage, radiusMeters, delivered: sent});

  if (sent) {
    showFeedback('Community alert sent to trusted contacts.');
  } else {
    showFeedback('Could not send alert automatically. Check SMS permissions.');
  }

  return sent;
};


