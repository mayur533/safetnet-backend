import {useEffect, useRef} from 'react';
import {Alert} from 'react-native';
import {useCheckInStore} from '../../stores/checkInStore';
import {sendCheckInUpdate} from '../../services/checkInMessagingService';
import {useAuthStore} from '../../stores/authStore';
import {useSubscription} from '../../lib/hooks/useSubscription';

const POLL_INTERVAL_MS = 60 * 1000;

const TrustedCheckInScheduler = () => {
  const load = useCheckInStore((state) => state.load);
  const markReminderSent = useCheckInStore((state) => state.recordReminderSent);
  const setAwaitingResponse = useCheckInStore((state) => state.setAwaitingResponse);
  const {isPremium} = useSubscription();
  const processingRef = useRef(false);

  useEffect(() => {
    load().catch((error) => console.warn('Failed to load check-ins', error));
  }, [load]);

  useEffect(() => {
    if (!isPremium) {
      return;
    }

    const interval = setInterval(() => {
      if (processingRef.current) {
        return;
      }
      processingRef.current = true;

      const {isAuthenticated} = useAuthStore.getState();
      if (!isAuthenticated) {
        processingRef.current = false;
        return;
      }

      const dueCheckIns = useCheckInStore.getState().getDueCheckIns();
      if (dueCheckIns.length === 0) {
        processingRef.current = false;
        return;
      }

      const userName = useAuthStore.getState().user?.name || 'SafeTNet member';

      Promise.all(
        dueCheckIns.map(async (checkIn) => {
          try {
            const success = await sendCheckInUpdate({checkIn, userName});
            if (success) {
              await markReminderSent(checkIn.id);
              Alert.alert('Check-in sent', `We notified your circle for "${checkIn.label}".`);
            } else {
              await setAwaitingResponse(checkIn.id, false);
            }
          } catch (error) {
            console.warn('Check-in reminder failed', error);
            await setAwaitingResponse(checkIn.id, false);
          }
        }),
      )
        .catch((error) => console.warn('Failed to process check-in reminders', error))
        .finally(() => {
          processingRef.current = false;
        });
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isPremium, markReminderSent, setAwaitingResponse]);

  return null;
};

export default TrustedCheckInScheduler;


