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
import { useSelector } from 'react-redux';
import { decryptText } from '../../utils/crypto';

function DecryptPasswordModal({ open, onClose, encryptedValue, onDecrypted }) {
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

      console.log('encryptedValue:', encryptedValue);

        const decrypted = await decryptText(
        encryptedValue,
        masterPassword,
        user?.encryptionSalt || 'vault-salt'
        );
      setMasterPassword('');
      onClose();
    } catch (err) {
      console.error('Decrypt error:', err);
      setError('Failed to decrypt. Check master password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <h2 className="text-2xl font-bold mb-2">Decrypt Password</h2>
        <p className="text-slate-500 mb-6">
          Enter your master password to reveal the saved password.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">
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
            className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none"
            required
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium"
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