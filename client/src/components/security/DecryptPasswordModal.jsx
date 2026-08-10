// import { useState } from 'react';
// import { decryptText } from '../../utils/crypto';

// function DecryptPasswordModal({ open, onClose, encryptedValue, onDecrypted }) {
//   const [masterPassword, setMasterPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   if (!open) return null;

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       setLoading(true);
//       setError('');

//       const decrypted = await decryptText(encryptedValue, masterPassword);
//       onDecrypted(decrypted);

//       setMasterPassword('');
//       onClose();
//     } catch (err) {
//       setError('Failed to decrypt. Check master password.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] px-4">
//       <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
//         <h2 className="text-2xl font-bold mb-2">Decrypt Password</h2>
//         <p className="text-slate-500 mb-6">
//           Enter your master password to reveal the saved password.
//         </p>

//         {error && (
//           <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <input
//             type="password"
//             placeholder="Master password"
//             value={masterPassword}
//             onChange={(e) => setMasterPassword(e.target.value)}
//             className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none"
//             required
//           />

//           <div className="flex justify-end gap-3">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-5 py-3 rounded-xl border border-slate-300"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={loading}
//               className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium"
//             >
//               {loading ? 'Decrypting...' : 'Decrypt'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default DecryptPasswordModal;

import { useState } from 'react';
import { X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { decryptText } from '../../utils/crypto';

function DecryptPasswordModal({ open, onClose, encryptedValue }) {
  const [masterPassword, setMasterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useSelector((state) => state.auth);
  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

        const _decrypted = await decryptText(
        encryptedValue,
        masterPassword,
        user?.encryptionSalt || 'vault-salt'
        );
      setMasterPassword('');
      onClose();
    } catch {
      console.error('Decrypt error:');
      setError('Failed to decrypt. Check master password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Decrypt Password</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Enter your master password to reveal the saved password.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Master password"
            value={masterPassword}
            on
            onChange={(e) => setMasterPassword(e.target.value)}
            className="w-full border border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 rounded-xl px-4 py-3 outline-none"
            required
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              {loading ? 'Decrypting...' : 'Decrypt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DecryptPasswordModal;