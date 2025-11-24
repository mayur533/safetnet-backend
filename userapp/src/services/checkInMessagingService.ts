import {Linking, Alert} from 'react-native';
import {useContactStore} from '../stores/contactStore';
import {sendSmsDirect} from './smsService';
import {CheckIn} from '../stores/checkInStore';
import {checkNetworkStatus} from './networkService';

const buildCheckInMessage = (userName: string, label: string) => {
  const name = userName || 'SafeTNet member';
  return `Check-in update from ${name}: ${label}. I am safe.`;
};

export const sendCheckInUpdate = async (options: {
  checkIn: CheckIn;
  userName: string;
}): Promise<boolean> => {
  const {checkIn, userName} = options;
  const message = buildCheckInMessage(userName, checkIn.label);
  const contactsStore = useContactStore.getState();
  const recipients = contactsStore.contacts
    .filter((contact) => checkIn.contactIds.includes(contact.id))
    .map((contact) => contact.phone);

  if (recipients.length === 0) {
    Alert.alert('No contacts selected', 'Add contacts to this check-in to send updates.');
    return false;
  }

  const smsUrl = `sms:${recipients.join(',')}?body=${encodeURIComponent(message)}`;
  const network = await checkNetworkStatus();
  if (network.isInternetReachable) {
    try {
      await Linking.openURL(smsUrl);
      return true;
    } catch (error) {
      console.warn('Unable to open SMS composer', error);
    }
  }

  const success = await sendSmsDirect(recipients, message);
  if (!success) {
    Alert.alert('Unable to send check-in', 'Please try again or check your SMS permissions.');
  }
  return success;
};





