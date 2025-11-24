import {useState, useEffect} from 'react';
import {checkAllLimits, LimitCheckResult} from '../../services/freeTierService';
import {useAuthStore} from '../../stores/authStore';
import {useContactStore} from '../../stores/contactStore';
import {useLiveShareStore} from '../../stores/liveShareStore';
import {useIncidentStore} from '../../stores/incidentStore';

export const useFreeTierLimits = () => {
  const user = useAuthStore((state) => state.user);
  const contacts = useContactStore((state) => state.contacts);
  const liveShareSession = useLiveShareStore((state) => state.session);
  const incidents = useIncidentStore((state) => state.incidents);
  const [activeLimits, setActiveLimits] = useState<LimitCheckResult[]>([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  useEffect(() => {
    if (user?.plan === 'premium') {
      setActiveLimits([]);
      setShowUpgradePrompt(false);
      return;
    }

    const limits = checkAllLimits();
    setActiveLimits(limits);

    // Show upgrade prompt if any limit is reached
    if (limits.length > 0) {
      const primaryLimit = limits[0]; // Show the first/most important limit
      setUpgradeMessage(primaryLimit.message);
      setShowUpgradePrompt(true);
    }
  }, [user?.plan, contacts, liveShareSession, incidents]);

  return {
    activeLimits,
    showUpgradePrompt,
    upgradeMessage,
    setShowUpgradePrompt,
  };
};

