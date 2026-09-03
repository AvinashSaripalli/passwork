import { useState } from 'react';
import { MailWarning, X, Send } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { requestEmailVerification } from '../../features/auth/authSlice';

function VerifyEmailBanner() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('vaultix-email-banner-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified === true || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    const result = await dispatch(requestEmailVerification());
    setSending(false);
    if (requestEmailVerification.fulfilled.match(result)) {
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('vaultix-email-banner-dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
        <MailWarning size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
          Your email is not verified yet.{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="font-semibold text-amber-900 dark:text-amber-200 hover:underline disabled:opacity-60 inline-flex items-center gap-1"
          >
            <Send size={12} />
            {sending ? 'Sending...' : sent ? 'Sent!' : 'Resend verification email'}
          </button>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default VerifyEmailBanner;
