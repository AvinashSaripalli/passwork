import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  LogIn,
  Save,
  Shield,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import {
  updateProfile,
  changePassword,
  changeMasterPassword,
} from '../../features/auth/authSlice';
import { validateEmail, validateFullName } from '../../utils/validation';
import AppLayout from '../../components/layout/AppLayout';

const TABS = [
  { key: 'info', label: 'Personal Info', icon: User },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'activity', label: 'Login Activity', icon: LogIn },
];

function ProfilePage() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('info');
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');

  const clearMessages = () => {
    setSuccess('');
    setServerError('');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 text-xl font-bold">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account and security settings</p>
          </div>
        </div>

        {serverError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {serverError}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); clearMessages(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'info' && (
          <InfoTab
            user={user}
            loading={loading}
            dispatch={dispatch}
            onSuccess={setSuccess}
            onError={setServerError}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            user={user}
            loading={loading}
            dispatch={dispatch}
            onSuccess={setSuccess}
            onError={setServerError}
          />
        )}

        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </AppLayout>
  );
}

function InfoTab({ user, loading, dispatch, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
    onSuccess('');
    onError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSuccess('');
    onError('');

    const nameError = validateFullName(formData.fullName);
    const emailError = validateEmail(formData.email);

    if (nameError || emailError) {
      setErrors({ fullName: nameError, email: emailError });
      return;
    }

    const result = await dispatch(updateProfile(formData));
    if (updateProfile.fulfilled.match(result)) {
      onSuccess('Profile updated successfully');
    } else {
      onError(result.payload || 'Failed to update profile');
    }
  };

  const inputClass = (field) =>
    `w-full rounded-xl border bg-white dark:bg-slate-700 dark:text-slate-200 px-4 py-3 outline-none transition-all focus:ring-4 ${
      errors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-100'
    }`;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
          <User size={20} className="text-slate-400 dark:text-slate-500" />
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Personal Information</p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className={inputClass('fullName')}
              placeholder="Your full name"
            />
            {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass('email')}
              placeholder="Your email address"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Role</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{user?.role || 'USER'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Account Created</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Master Password</span>
            <span className={`font-medium ${user?.hasMasterPassword ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {user?.hasMasterPassword ? 'Enabled' : 'Not Set'}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SecurityTab({ user, loading, dispatch, onSuccess, onError }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});

  const [showMpCurrent, setShowMpCurrent] = useState(false);
  const [showMpNew, setShowMpNew] = useState(false);

  const [mpForm, setMpForm] = useState({
    currentMasterPassword: '',
    newMasterPassword: '',
    hint: '',
  });
  const [mpErrors, setMpErrors] = useState({});

  const inputClass = (field, errors) =>
    `w-full rounded-xl border bg-white dark:bg-slate-700 dark:text-slate-200 px-4 py-3 outline-none transition-all focus:ring-4 ${
      errors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-100'
    }`;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    onSuccess('');
    onError('');

    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!pwForm.newPassword) errs.newPassword = 'New password is required';
    else if (pwForm.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}[\]|~`])/.test(pwForm.newPassword))
      errs.newPassword = 'Must include uppercase, lowercase, number, and special character';

    if (Object.keys(errs).length) {
      setPwErrors(errs);
      return;
    }

    setPwErrors({});
    const result = await dispatch(changePassword(pwForm));
    if (changePassword.fulfilled.match(result)) {
      onSuccess('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '' });
    } else {
      onError(result.payload || 'Failed to change password');
    }
  };

  const handleChangeMasterPassword = async (e) => {
    e.preventDefault();
    onSuccess('');
    onError('');

    const errs = {};
    if (!mpForm.currentMasterPassword) errs.currentMasterPassword = 'Current master password is required';
    if (!mpForm.newMasterPassword) errs.newMasterPassword = 'New master password is required';
    else if (mpForm.newMasterPassword.length < 8) errs.newMasterPassword = 'Must be at least 8 characters';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}[\]|~`])/.test(mpForm.newMasterPassword))
      errs.newMasterPassword = 'Must include uppercase, lowercase, number, and special character';

    if (Object.keys(errs).length) {
      setMpErrors(errs);
      return;
    }

    setMpErrors({});
    const result = await dispatch(changeMasterPassword(mpForm));
    if (changeMasterPassword.fulfilled.match(result)) {
      onSuccess('Master password changed successfully');
      setMpForm({ currentMasterPassword: '', newMasterPassword: '', hint: '' });
    } else {
      onError(result.payload || 'Failed to change master password');
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Login Password */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
            <Lock size={20} className="text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Password</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update your account login password</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={(e) => { setPwErrors((p) => ({ ...p, currentPassword: '' })); setPwForm((p) => ({ ...p, currentPassword: e.target.value })); }}
                  className={inputClass('currentPassword', pwErrors)}
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                  {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {pwErrors.currentPassword && <p className="mt-1 text-sm text-red-500">{pwErrors.currentPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => { setPwErrors((p) => ({ ...p, newPassword: '' })); setPwForm((p) => ({ ...p, newPassword: e.target.value })); }}
                  className={inputClass('newPassword', pwErrors)}
                  placeholder="Enter new password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                  {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {pwErrors.newPassword && <p className="mt-1 text-sm text-red-500">{pwErrors.newPassword}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              <Save size={16} />
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Master Password */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
        <form onSubmit={handleChangeMasterPassword} className="space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
            <KeyRound size={20} className="text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Change Master Password</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update the key used to encrypt your vault data</p>
            </div>
          </div>

          {!user?.hasMasterPassword && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-400">
              You have not set a master password yet. Go to the first-time setup to create one.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Master Password</label>
              <div className="relative">
                <input
                  type={showMpCurrent ? 'text' : 'password'}
                  value={mpForm.currentMasterPassword}
                  onChange={(e) => { setMpErrors((p) => ({ ...p, currentMasterPassword: '' })); setMpForm((p) => ({ ...p, currentMasterPassword: e.target.value })); }}
                  className={inputClass('currentMasterPassword', mpErrors)}
                  placeholder="Enter current master password"
                />
                <button type="button" onClick={() => setShowMpCurrent(!showMpCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                  {showMpCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {mpErrors.currentMasterPassword && <p className="mt-1 text-sm text-red-500">{mpErrors.currentMasterPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Master Password</label>
              <div className="relative">
                <input
                  type={showMpNew ? 'text' : 'password'}
                  value={mpForm.newMasterPassword}
                  onChange={(e) => { setMpErrors((p) => ({ ...p, newMasterPassword: '' })); setMpForm((p) => ({ ...p, newMasterPassword: e.target.value })); }}
                  className={inputClass('newMasterPassword', mpErrors)}
                  placeholder="Enter new master password"
                />
                <button type="button" onClick={() => setShowMpNew(!showMpNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                  {showMpNew ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {mpErrors.newMasterPassword && <p className="mt-1 text-sm text-red-500">{mpErrors.newMasterPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hint (optional)</label>
              <input
                type="text"
                value={mpForm.hint}
                onChange={(e) => setMpForm((p) => ({ ...p, hint: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
                placeholder="A reminder for your master password"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !user?.hasMasterPassword}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              <Save size={16} />
              {loading ? 'Changing...' : 'Change Master Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActivityTab() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/login-activity');
        setActivities(res.data.activities || []);
      } catch {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-400 dark:text-slate-500">
        No login activity recorded
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
      <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
        <LogIn size={20} className="text-slate-400 dark:text-slate-500" />
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Login Activity</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your last {activities.length} login attempts</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {activities.slice(0, 20).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                item.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                item.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
              }`}>
                <LogIn size={14} />
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  item.status === 'SUCCESS' ? 'text-green-700 dark:text-green-400' :
                  item.status === 'FAILED' ? 'text-red-700 dark:text-red-400' :
                  'text-amber-700 dark:text-amber-400'
                }`}>
                  {item.status === 'SUCCESS' ? 'Successful Login' : item.status === 'FAILED' ? 'Failed Login' : 'Blocked'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 dark:text-slate-500">
              {item.ipAddress && <p>{item.ipAddress}</p>}
              {item.userAgent && (
                <p className="max-w-[200px] truncate" title={item.userAgent}>{item.userAgent}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProfilePage;
