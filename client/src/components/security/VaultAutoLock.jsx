import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMasterVerified } from '../../features/auth/authSlice';

const INACTIVITY_LIMIT = 5 * 60 * 1000;

function VaultAutoLock() {
  const dispatch = useDispatch();
  const { isMasterVerified } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isMasterVerified) return;

    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        dispatch(setMasterVerified(false));
        alert('Vault locked due to inactivity');
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isMasterVerified, dispatch]);

  return null;
}

export default VaultAutoLock;