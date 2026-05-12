import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearError,
  setMasterPassword,
  setMasterVerified,
} from '../../features/auth/authSlice';
import logo from '../../assets/Vaultix.png';
import bgImage from '../../assets/auth-bg.png';

function SetMasterPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, loading, error, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    masterPassword: '',
    confirmMasterPassword: '',
    hint: '',
  });

  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.hasMasterPassword || user?.masterPasswordHint) {
      navigate('/enter-master-password');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const updateField = (field, value) => {
    setLocalError('');
    setFormData((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.masterPassword.length < 6) {
      setLocalError('Master password must be at least 6 characters.');
      return;
    }

    if (formData.masterPassword !== formData.confirmMasterPassword) {
      setLocalError('Master passwords do not match.');
      return;
    }

    const result = await dispatch(
      setMasterPassword({
        masterPassword: formData.masterPassword,
        hint: formData.hint,
      })
    );

    if (setMasterPassword.fulfilled.match(result)) {
      dispatch(setMasterVerified(true));
      navigate('/dashboard');
    }
  };

  return (
    <div
      className="h-screen overflow-hidden bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-white/35" />

      <div className="relative z-10 h-full max-w-[1450px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_440px] items-center gap-8 px-10">
        <div className="max-w-[800px]">
          <img src={logo} alt="Vaultix" className="w-64 mb-10" />

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 px-4 py-2 text-sm font-semibold text-blue-700 mb-6">
            <ShieldCheck size={16} />
            First-time security setup
          </div>

          <h1 className="text-6xl font-black leading-[1.05] tracking-[-2px] text-[#020617]">
            Protect your vault with a master password.
          </h1>

          <p className="text-slate-600 mt-6 text-[20px] leading-9 max-w-3xl">
            Your master password protects access to sensitive credentials,
            private vaults, shared passwords, and secure actions.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-4xl">
            <Feature icon={LockKeyhole} title="Private Access" text="Required before opening vaults." />
            <Feature icon={KeyRound} title="Sensitive Actions" text="Protect view, copy and edit." />
            <Feature icon={CheckCircle2} title="Safer Workspace" text="Useful in shared systems." />
          </div>
        </div>

        <AuthCard title="Set master password" subtitle="Create a strong password to unlock your workspace.">
          {(error || localError) && <ErrorBox message={localError || error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Master password"
              value={formData.masterPassword}
              onChange={(value) => updateField('masterPassword', value)}
            />

            <Input
              type="password"
              placeholder="Confirm master password"
              value={formData.confirmMasterPassword}
              onChange={(value) => updateField('confirmMasterPassword', value)}
            />

            <input
              type="text"
              placeholder="Password hint (optional)"
              value={formData.hint}
              onChange={(e) => updateField('hint', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white/90 px-5 py-4 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-4 text-sm text-blue-700">
              Use a password you can remember. This protects access to your
              stored credentials.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Master Password'}
            </button>
          </form>
        </AuthCard>
      </div>
    </div>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="bg-white/88 backdrop-blur-md rounded-[32px] shadow-[0_20px_60px_rgba(37,99,235,0.14)] border border-white p-9 w-full max-w-[440px]">
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

export default SetMasterPasswordPage;