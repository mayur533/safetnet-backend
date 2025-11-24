import {useEffect} from 'react';
import {useResponseCenterStore} from '../../stores/responseCenterStore';

const ResponseCenterManager = () => {
  const load = useResponseCenterStore((state) => state.load);

  useEffect(() => {
    load().catch((error) => console.warn('Failed to load response center state', error));
  }, [load]);

  return null;
};

export default ResponseCenterManager;


