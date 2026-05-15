import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeEditPasswordModal,
  updatePassword,
} from '../../features/vault/vaultSlice';

function EditPasswordModal() {
  const dispatch = useDispatch();

  const {
    isEditPasswordModalOpen,
    passwords,
    selectedPasswordId,
    actionLoading,
    folders,
  } = useSelector((state) => state.vault);

  const selectedPassword = passwords.find(
    (item) => item.id === selectedPasswordId
  );

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    encryptedPassword: '',
    confirmPassword: '',
    url: '',
    folderId: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [localError, setLocalError] = useState('');

  const currentFolder = folders.find(
    (f) => f.id === formData.folderId
  );

  useEffect(() => {
    if (selectedPassword) {
      setFormData({
        name: selectedPassword.name || '',
        login: selectedPassword.login || '',
        encryptedPassword:
          selectedPassword.encryptedPassword || '',
        confirmPassword:
          selectedPassword.encryptedPassword || '',
        url: selectedPassword.url || '',
        folderId: selectedPassword.folderId || '',
      });
    }
  }, [selectedPassword]);

  if (
    !isEditPasswordModalOpen ||
    !selectedPassword
  )
    return null;

  const handleClose = () => {
    setLocalError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    dispatch(closeEditPasswordModal());
  };

  const handleChange = (e) => {
    setLocalError('');

    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Password name is required';
    }

    if (!formData.login.trim()) {
      return 'Login is required';
    }

    if (!formData.encryptedPassword) {
      return 'Password is required';
    }

    if (
      formData.encryptedPassword.length < 6
    ) {
      return 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      return 'Confirm password is required';
    }

    if (
      formData.encryptedPassword !==
      formData.confirmPassword
    ) {
      return 'Password and confirm password do not match';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const result = await dispatch(
      updatePassword({
        passwordId: selectedPassword.id,
        payload: {
          name: formData.name.trim(),
          login: formData.login.trim(),
          encryptedPassword:
            formData.encryptedPassword,
          url: formData.url.trim(),
          folderId:
            formData.folderId || null,
        },
      })
    );

    if (
      updatePassword.fulfilled.match(result)
    ) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Edit Password
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Update password details
            </p>
          </div>

          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-500">
            Current folder:
            <span className="font-semibold text-slate-800 ml-1">
              {currentFolder?.name ||
                'No folder'}
            </span>
          </p>
        </div>

        {localError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">
              {localError}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-4"
        >
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />

          <input
            type="text"
            name="login"
            placeholder="Login"
            value={formData.login}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />

          <div className="relative">
            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              name="encryptedPassword"
              placeholder="Password"
              value={
                formData.encryptedPassword
              }
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 pr-11 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (prev) => !prev
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <div className="relative">
            <input
              type={
                showConfirmPassword
                  ? 'text'
                  : 'password'
              }
              name="confirmPassword"
              placeholder="Confirm Password"
              value={
                formData.confirmPassword
              }
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 pr-11 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (prev) => !prev
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          <input
            type="text"
            name="url"
            placeholder="URL"
            value={formData.url}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <select
            name="folderId"
            value={formData.folderId}
            onChange={handleChange}
            className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">
              No folder
            </option>

            {folders.map((folder) => (
              <option
                key={folder.id}
                value={folder.id}
              >
                {folder.name}
              </option>
            ))}
          </select>

          <div className="col-span-2 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {actionLoading
                ? 'Updating...'
                : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPasswordModal;