import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, registerUser } from '../../features/auth/authSlice';
import logo from '../../assets/Vaultix.png';
import bgImage from '../../assets/auth-bg.png';

function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/set-master-password');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerUser(formData));
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

          <h1 className="text-6xl font-black leading-[1.05] tracking-[-2px] text-[#020617]">
            Start securing your business passwords today.
          </h1>

          <p className="text-slate-600 mt-6 text-[20px] leading-9 max-w-3xl">
            Create your Vaultix workspace to manage company credentials,
            personal vaults, password sharing, and secure access control.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10 max-w-4xl">
            <Feature
              icon={ShieldCheck}
              title="Encrypted Vaults"
              text="Keep sensitive credentials protected."
            />

            <Feature
              icon={LockKeyhole}
              title="Master Security"
              text="Add verification before access."
            />

            <Feature
              icon={Users}
              title="Team Sharing"
              text="Share passwords safely."
            />
          </div>
        </div>

        <AuthCard
          title="Create account"
          subtitle="Start managing passwords securely."
        >
          {error && <ErrorBox message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Full name"
              value={formData.fullName}
              onChange={(value) =>
                setFormData((p) => ({
                  ...p,
                  fullName: value,
                }))
              }
            />

            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(value) =>
                setFormData((p) => ({
                  ...p,
                  email: value,
                }))
              }
            />

            {/* Password Field With Eye Icon */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    password: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-300 bg-white/90 px-5 pr-12 py-4 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600">
              Login
            </Link>
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

export default RegisterPage;