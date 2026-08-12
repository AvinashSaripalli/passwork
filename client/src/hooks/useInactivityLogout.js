import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  logout,
  showSessionWarning,
  updateSessionWarningSeconds,
  dismissSessionWarning,
} from '../features/auth/authSlice';

const TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 1000;
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

export const touchActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // storage unavailable
  }
};

export default function useInactivityLogout() {
  const dispatch = useDispatch();
  const { isAuthenticated, isMasterVerified, sessionWarningOpen } = useSelector(
    (state) => state.auth
  );
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isMasterVerified) return;

    const checkInactivity = () => {
      const last = readLastActivity();
      if (!last) return;

      const elapsed = Date.now() - last;
      const remaining = TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        dispatch(logout());
        return;
      }

      if (remaining <= WARNING_MS) {
        const secondsLeft = Math.ceil(remaining / 1000);
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          dispatch(showSessionWarning(secondsLeft));
        } else if (sessionWarningOpen) {
          dispatch(updateSessionWarningSeconds(secondsLeft));
        }
      } else if (warningShownRef.current) {
        warningShownRef.current = false;
        dispatch(dismissSessionWarning());
      }
    };

    const handleActivity = () => {
      touchActivity();
      if (warningShownRef.current) {
        warningShownRef.current = false;
        dispatch(dismissSessionWarning());
      }
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
  }, [isAuthenticated, isMasterVerified, sessionWarningOpen, dispatch]);
}
