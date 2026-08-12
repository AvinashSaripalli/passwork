import { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { generateTOTP } from '../../utils/crypto';

function TotpField({ secret, revealed, onReveal, onCopy }) {
  const [totp, setTotp] = useState(null);

  useEffect(() => {
    if (!revealed || !secret) return undefined;

    let cancelled = false;

    const tick = () => {
      generateTOTP(secret).then((result) => {
        if (!cancelled && result) {
          setTotp({ secret, code: result.code, secondsRemaining: result.secondsRemaining });
        }
      });
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [revealed, secret]);

  const currentCode = totp && totp.secret === secret ? totp : null;

  return (
    <div className="border-b border-slate-200 py-5 dark:border-slate-700">
      <div className="grid grid-cols-[140px_1fr_80px] items-center">
        <p className="text-slate-500 dark:text-slate-400">Authenticator</p>
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-lg tracking-widest text-slate-900 truncate dark:text-slate-100">
            {revealed && currentCode ? currentCode.code : '••••••'}
          </p>
          {revealed && currentCode && (
            <span
              className={`text-xs shrink-0 ${
                currentCode.secondsRemaining <= 5
                  ? 'text-red-500'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {currentCode.secondsRemaining}s
            </span>
          )}
        </div>
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={onReveal}
            title={revealed ? 'Hide code' : 'Show code'}
            className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            onClick={onCopy}
            title="Copy code"
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <Copy size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TotpField;
