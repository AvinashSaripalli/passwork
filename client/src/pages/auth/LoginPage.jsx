import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, loginUser, logout } from '../../features/auth/authSlice';
import { validateEmail, validatePassword } from '../../utils/validation';
import logo from '../../assets/Vaultix.png';
import bgImage from '../../assets/auth-bg.png';

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, loading, error, isAuthenticated, userLoaded } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated && user && userLoaded) {
      navigate(
        user.hasMasterPassword || user.masterPasswordHint
          ? '/enter-master-password'
          : '/set-master-password'
      );
    }
  }, [isAuthenticated, user, userLoaded, navigate]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }
    setErrors({});
    dispatch(loginUser(formData));
  };

  return (
    <div
      className="h-screen overflow-hidden bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-white/35 dark:bg-slate-950/60" />

      <div className="relative z-10 h-full max-w-[1450px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_430px] items-center gap-8 px-10">
        <div className="max-w-[780px]">
          <img src={logo} alt="Vaultix" className="w-64 mb-10" />

          <h1 className="text-6xl font-black leading-[1.05] tracking-[-2px] text-[#020617] dark:text-white">
            Secure password management for your business.
          </h1>

          <p className="text-slate-600 dark:text-slate-300 mt-6 text-[20px] leading-9 max-w-3xl">
            Store, organize, and share credentials safely with personal vaults,
            company vaults, master password protection, and controlled access.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-4xl">
            <Feature icon={ShieldCheck} title="Secure Vaults" text="Protect sensitive credentials." />
            <Feature icon={LockKeyhole} title="Master Lock" text="Verify before vault access." />
            <Feature icon={Users} title="Safe Sharing" text="Share passwords with control." />
          </div>
        </div>

        <AuthCard title="Welcome back" subtitle="Login to access your secure vault.">
          {error && <ErrorBox message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              error={errors.email}
              onChange={(value) => {
                setErrors((p) => ({ ...p, email: '' }));
                setFormData((p) => ({ ...p, email: value }));
              }}
            />

            <PasswordInput
              value={formData.password}
              showPassword={showPassword}
              error={errors.password}
              onToggle={() => setShowPassword((prev) => !prev)}
              onChange={(value) => {
                setErrors((p) => ({ ...p, password: '' }));
                setFormData((p) => ({ ...p, password: value }));
              }}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600 dark:text-slate-300">
            Don’t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  dispatch(logout());
                  navigate('/register');
                }}
                className="font-semibold text-blue-600"
              >
                Create account
              </button>
          </p>
        </AuthCard>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, showPassword, onToggle, error }) {
  return (
    <div>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border bg-white/90 dark:bg-slate-800/90 dark:text-slate-100 px-5 pr-12 py-4 outline-none transition-all focus:ring-4 ${
            error
              ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-100'
              : 'border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-100'
          }`}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="bg-white/88 dark:bg-slate-800/90 backdrop-blur-md rounded-[32px] shadow-[0_20px_60px_rgba(37,99,235,0.14)] border border-white dark:border-slate-600 p-9 w-full max-w-[430px]">
      <h2 className="text-4xl font-black text-slate-950 dark:text-white">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 mt-2 mb-7">{subtitle}</p>
      {children}
    </div>
  );
}

function Input({ type, placeholder, value, onChange, error }) {
  return (
    <div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border bg-white/90 dark:bg-slate-800/90 dark:text-slate-100 px-5 py-4 outline-none transition-all focus:ring-4 ${
          error
            ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-100'
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-3xl border border-white/80 dark:border-slate-600/50 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-5 shadow-sm">
      <Icon size={24} className="text-blue-600 dark:text-blue-400" />
      <h3 className="font-bold text-slate-900 dark:text-slate-100 mt-4">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{text}</p>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {message}
    </div>
  );
}

export default LoginPage;