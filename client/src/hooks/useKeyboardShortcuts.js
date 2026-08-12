import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import useLockVault from './useLockVault';

export default function useKeyboardShortcuts() {
  const { isMasterVerified } = useSelector((state) => state.auth);
  const lockVault = useLockVault();

  useEffect(() => {
    if (!isMasterVerified) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockVault('Vault locked (Ctrl+Shift+L)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMasterVerified, lockVault]);
}
