import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';

function TeamManagementPage() {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await api.get('/users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token, user]);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDelete = async (id, fullName) => {
    const confirmDelete = window.confirm(`Delete user "${fullName}"?`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.fullName} ${u.email} ${u.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Team Management
            </h1>
            <p className="text-slate-500 mt-2">
              Manage users, roles, and access
            </p>
          </div>

          <button
            onClick={() => navigate('/team-management/add')}
            className="h-11 px-5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Add User
          </button>
        </div>

        <div className="mb-6">
          <input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 border border-slate-300 rounded-xl px-4 outline-none focus:border-indigo-500"
          />
        </div>

        {loading && (
          <p className="text-slate-500 text-sm">Loading users...</p>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {u.fullName}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {u.email}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            u.role === 'ADMIN'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            u.isActive
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/team-management/edit/${u.id}`)}
                            className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(u.id, u.fullName)}
                            className="px-4 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredUsers.length && (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default TeamManagementPage;