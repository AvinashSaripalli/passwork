import { useEffect, useState } from 'react';
import { Monitor, User, Globe2 } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';

function LoginActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get('/login-activity');
      setActivities(res.data.activities || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load login activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Login Activity
          </h1>
          <p className="text-slate-500 mt-2">
            Track users login activity with IP address
          </p>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-500">
            Loading login activity...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {!loading && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-600">
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">IP Address</th>
                  <th className="px-5 py-4">Device</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date & Time</th>
                </tr>
              </thead>

              <tbody>
                {activities.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <User size={16} />
                        {item.user?.fullName || '-'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {item.user?.email || '-'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Globe2 size={16} />
                        {item.ipAddress || '-'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600 max-w-[320px] truncate">
                        <Monitor size={16} />
                        {item.userAgent || '-'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                        {item.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {!activities.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No login activity found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default LoginActivityPage;