import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, LockKeyhole, ShieldCheck, TimerReset } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { setMasterVerified } from '../../features/auth/authSlice';
import logo from '../../assets/Vaultix.png';
import bgImage from '../../assets/auth-bg.png';

function EnterMasterPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { token, isAuthenticated, user, loading } = useSelector(
    (state) => state.auth
  );

  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setVerifying(true);
      setError('');

      await api.post(
        '/auth/verify-master-password',
        { masterPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      dispatch(setMasterVerified(true));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid master password');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="h-screen overflow-hidden bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-white/35" />

      <div className="relative z-10 h-full max-w-[1450px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_430px] items-center gap-8 px-10">
        <div className="max-w-[780px]">
          <img src={logo} alt="Vaultix" className="w-64 mb-10" />

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-4 py-2 text-sm font-semibold text-blue-700 mb-6">
            <ShieldCheck size={16} />
            Secure vault verification
          </div>

          <h1 className="text-6xl font-black leading-[1.05] tracking-[-2px] text-[#020617]">
            Unlock your secure Vaultix workspace.
          </h1>

          <p className="text-slate-600 mt-6 text-[20px] leading-9 max-w-3xl">
            Welcome{user?.fullName ? `, ${user.fullName}` : ''}. Enter your
            master password to access protected vaults and sensitive
            credentials.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-4xl">
            <Feature icon={LockKeyhole} title="Locked Vault" text="Protected until verified." />
            <Feature icon={KeyRound} title="Private Access" text="Only verified users continue." />
            <Feature icon={TimerReset} title="Quick Re-lock" text="Lock anytime from the top bar." />
          </div>
        </div>

        <AuthCard title="Unlock vault" subtitle="Enter your master password to continue.">
          {user?.masterPasswordHint && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Hint: {user.masterPasswordHint}
            </div>
          )}

          {error && <ErrorBox message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Master password"
              value={masterPassword}
              onChange={setMasterPassword}
            />

            <button
              type="submit"
              disabled={verifying || loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-60"
            >
              {verifying ? 'Verifying...' : 'Unlock Vault'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Your vault stays locked until your master password is verified.
          </p>
        </AuthCard>
      </div>
    </div>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="bg-white/88 backdrop-blur-md rounded-[32px] shadow-[0_20px_60px_rgba(37,99,235,0.14)] border border-white p-9 w-full max-w-[430px]">
      <h2 className="text-4xl font-black text-slate-950">{title}</h2>
      <p className="text-slate-500 mt-2 mb-7">{subtitle}</p>
      {children}
    </div>
  );
}

function Input({ type, placeholder, value, onChange }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-slate-300 bg-white/90 px-5 py-4 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      required
    />
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
      <Icon size={24} className="text-blue-600" />
      <h3 className="font-bold text-slate-900 mt-4">{title}</h3>
      <p className="text-sm text-slate-600 mt-1">{text}</p>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      {message}
    </div>
  );
}

export default EnterMasterPasswordPage;