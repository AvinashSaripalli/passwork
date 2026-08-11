import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';

const TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
const LAST_ACTIVITY_KEY = 'vaultix-last-activity';

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

const readLastActivity = () => {
  try {
    const raw = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
};

const touchActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // storage unavailable - ignore
  }
};

export default function useInactivityLogout() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkInactivity = () => {
      const last = readLastActivity();
      if (last && Date.now() - last >= TIMEOUT_MS) {
        dispatch(logout());
      }
    };

    const handleActivity = () => {
      touchActivity();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    touchActivity();
    EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    window.addEventListener('focus', handleActivity);
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [isAuthenticated, dispatch]);
}
