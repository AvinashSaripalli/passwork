import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import { fetchSecurityDashboard } from '../../features/dashboard/dashboardSlice';

function DashboardPage() {
  const dispatch = useDispatch();
  const {
    totalPasswords,
    weakPasswords,
    oldPasswords,
    riskPasswords,
    recentPasswords,
    loading,
    error,
  } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchSecurityDashboard());
  }, [dispatch]);

  const stats = [
    {
      label: 'Total Passwords',
      value: totalPasswords,
      subtext: 'Stored in vaults',
      valueClass: 'text-slate-900',
      bgClass: 'bg-white',
    },
    {
      label: 'Weak Passwords',
      value: weakPasswords,
      subtext: 'Need stronger passwords',
      valueClass: 'text-green-600',
      bgClass: 'bg-white',
    },
    {
      label: 'Old or Expired',
      value: oldPasswords,
      subtext: 'Consider updating soon',
      valueClass: 'text-yellow-600',
      bgClass: 'bg-white',
    },
    {
      label: 'Risks',
      value: riskPasswords,
      subtext: 'Potential security issues',
      valueClass: 'text-red-600',
      bgClass: 'bg-white',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Security Dashboard
              </h1>
              <p className="text-slate-500 mt-2">
                Monitor password health and recent activity
              </p>
            </div>

            <button
              onClick={() => dispatch(fetchSecurityDashboard())}
              className="h-11 px-5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
            >
              Analyze Again
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-slate-500">Loading dashboard...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border border-slate-200 p-6 ${item.bgClass}`}
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <h2 className={`text-4xl font-bold mt-3 ${item.valueClass}`}>
                    {item.value}
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">{item.subtext}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Recent Passwords
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Latest passwords included in your dashboard analysis
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-600">
                      <th className="px-5 py-4 font-semibold">Name</th>
                      <th className="px-5 py-4 font-semibold">Vault</th>
                      <th className="px-5 py-4 font-semibold">Login</th>
                      <th className="px-5 py-4 font-semibold">Weak</th>
                      <th className="px-5 py-4 font-semibold">Old</th>
                      <th className="px-5 py-4 font-semibold">Risk</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentPasswords.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {row.name}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {row.vault?.name || '-'}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {row.login}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              row.isWeak
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.isWeak ? 'Yes' : 'No'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              row.isOld
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.isOld ? 'Yes' : 'No'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              row.isAtRisk
                                ? 'bg-red-50 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.isAtRisk ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {!recentPasswords.length && (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No passwords found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default DashboardPage;