import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';

const SESSION_TIMEOUT = 30 * 60 * 1000;

function VaultAutoLock() {
  const dispatch = useDispatch();
  const { isMasterVerified } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isMasterVerified) return;

    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        dispatch(logout());
        alert('Session expired due to inactivity. Please log in again.');
      }, SESSION_TIMEOUT);
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
