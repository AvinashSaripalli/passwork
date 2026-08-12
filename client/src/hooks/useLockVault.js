import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { lockVault as lockVaultAction } from '../features/auth/authSlice';
import { showToast } from '../utils/toast';

export default function useLockVault() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const lockVault = useCallback(
    (message = 'Vault locked') => {
      dispatch(lockVaultAction());
      showToast(message, 'info');
      navigate('/enter-master-password');
    },
    [dispatch, navigate]
  );

  return lockVault;
}
