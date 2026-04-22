import { useDispatch, useSelector } from 'react-redux';
import { setMasterVerified } from '../../features/auth/authSlice';

function Topbar() {
  const dispatch = useDispatch();
  const { user, isMasterVerified } = useSelector((state) => state.auth);

  return (
    <div className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-8">
      <h2 className="text-sm font-semibold text-slate-700">Password Manager</h2>

      <div className="flex items-center gap-6">
        {isMasterVerified && (
          <button
            onClick={() => dispatch(setMasterVerified(false))}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Lock Vault
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">{user?.fullName || 'User'}</p>
            <p className="text-xs text-slate-500">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Topbar;