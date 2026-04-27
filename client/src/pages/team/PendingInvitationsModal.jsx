import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../services/api';

function PendingInvitationsModal({ open, onClose }) {
  const { token } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get('/invitations/pending/list', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInvitations(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchInvitations();
    }
  }, [open]);

  if (!open) return null;

  const handleSendInvitation = async (e) => {
    e.preventDefault();

    try {
      setSending(true);
      setError('');
      setMessage('');

      await api.post(
        '/invitations',
        { email, role },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage('Invitation sent successfully');
      setEmail('');
      setRole('USER');
      fetchInvitations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[80] px-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Send Invitation
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Send registration link and view pending invitations
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ×
          </button>
        </div>

        <div className="p-8">
          {message && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSendInvitation}
            className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 mb-8"
          >
            <input
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border border-slate-300 rounded-xl px-4 outline-none focus:border-indigo-500"
              required
            />

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-12 border border-slate-300 rounded-xl px-4 outline-none focus:border-indigo-500"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <button
              type="submit"
              disabled={sending}
              className="h-12 px-6 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Pending Invitations
                </h3>
                <p className="text-sm text-slate-500">
                  Users invited but not registered yet
                </p>
              </div>

              <button
                onClick={fetchInvitations}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Loading invitations...</p>
            ) : (
              <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="px-5 py-4 font-semibold">Email</th>
                      <th className="px-5 py-4 font-semibold">Role</th>
                      <th className="px-5 py-4 font-semibold">Invited By</th>
                      <th className="px-5 py-4 font-semibold">Expires</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invitations.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {item.email}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              item.role === 'ADMIN'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.role}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {item.inviter?.fullName ||
                            item.inviter?.email ||
                            '-'}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {item.expiresAt
                            ? new Date(item.expiresAt).toLocaleDateString()
                            : '-'}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                            Pending
                          </span>
                        </td>
                      </tr>
                    ))}

                    {!invitations.length && (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No pending invitations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingInvitationsModal;