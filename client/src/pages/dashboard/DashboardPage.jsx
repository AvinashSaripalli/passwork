import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import {
  fetchSecuritySummary,
  fetchPasswordActivity,
  fetchRecentPasswords,
  fetchPasswordHealth,
  fetchVaultPasswordCounts,
  fetchRecentActivity,
} from '../../features/dashboard/dashboardSlice';

const RANGE_OPTIONS = [
  { label: '7 Days', value: '7D' },
  { label: '30 Days', value: '30D' },
  { label: 'This Month', value: 'THIS_MONTH' },
  { label: 'Last Month', value: 'LAST_MONTH' },
  { label: '6 Months', value: '6M' },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

function formatAction(action) {
  return action?.replaceAll('_', ' ') || '-';
}

function SecurityScoreGraph({
  securityScore,
  weakPasswords,
  oldPasswords,
  riskPasswords,
}) {
  const score = securityScore ?? 100;

  const scoreColor =
    score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const scoreLabel =
    score >= 80 ? 'Good' : score >= 50 ? 'Needs Attention' : 'Poor';

  const data = [{ name: 'Security Score', value: score, fill: scoreColor }];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-slate-900">Security Score</h3>
      <p className="text-sm text-slate-500 mt-1">
        Overall vault health based on password quality
      </p>

      <div className="h-[260px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="95%"
            barSize={18}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: '#e5e7eb' }}
              dataKey="value"
              cornerRadius={20}
            />

            <text
              x="50%"
              y="43%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-900 text-5xl font-bold"
            >
              {score}
            </text>

            <text
              x="50%"
              y="56%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-sm"
            >
              out of 100
            </text>

            <text
              x="50%"
              y="66%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={scoreColor}
              className="text-sm font-semibold"
            >
              {scoreLabel}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-2 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Weak</p>
          <p className="font-bold text-slate-900">{weakPasswords}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Old</p>
          <p className="font-bold text-slate-900">{oldPasswords}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Risk</p>
          <p className="font-bold text-slate-900">{riskPasswords}</p>
        </div>
      </div>
    </div>
  );
}

function PasswordTrendGraph({ data = [], range, onRangeChange }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">
            Password Activity
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Track added and deleted passwords by selected period
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((item) => (
            <button
              key={item.value}
              onClick={() => onRangeChange(item.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                range === item.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] rounded-2xl bg-slate-50 border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="added"
              name="Passwords Added"
              stroke="#10b981"
              strokeWidth={3}
            />

            <Line
              type="monotone"
              dataKey="deleted"
              name="Passwords Deleted"
              stroke="#f43f5e"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PasswordHealthDonut({ data = [] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-slate-900">
        Password Health
      </h3>
      <p className="text-sm text-slate-500 mt-1">
        Breakdown of safe, weak, old and risky passwords
      </p>

      <div className="h-[300px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VaultWisePasswordCount({ data = [] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-slate-900">
        Vault-wise Password Count
      </h3>
      <p className="text-sm text-slate-500 mt-1">
        Password distribution across vaults
      </p>

      <div className="h-[300px] mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" name="Passwords" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentActivityTimeline({ data = [] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-bold text-slate-900">
        Recent Activity
      </h3>
      <p className="text-sm text-slate-500 mt-1">
        Latest actions performed in accessible vaults
      </p>

      <div className="mt-6 space-y-4">
        {data.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="mt-1 h-3 w-3 rounded-full bg-indigo-600" />

            <div className="border-b border-slate-100 pb-4 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {formatAction(item.action)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {item.user?.fullName || item.user?.email || 'User'} •{' '}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : '-'}
              </p>
            </div>
          </div>
        ))}

        {!data.length && (
          <p className="text-sm text-slate-500">No recent activity found.</p>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const dispatch = useDispatch();
  const [range, setRange] = useState('6M');

  const {
    totalPasswords,
    weakPasswords,
    oldPasswords,
    riskPasswords,
    securityScore,
    recentPasswords,
    passwordTrend,
    passwordHealth,
    vaultPasswordCounts,
    recentActivity,
    summaryLoading,
    activityLoading,
    recentLoading,
    healthLoading,
    vaultCountsLoading,
    recentActivityLoading,
    error,
  } = useSelector((state) => state.dashboard);

  const loading =
    summaryLoading ||
    activityLoading ||
    recentLoading ||
    healthLoading ||
    vaultCountsLoading ||
    recentActivityLoading;

  useEffect(() => {
    dispatch(fetchSecuritySummary());
    dispatch(fetchRecentPasswords());
    dispatch(fetchPasswordHealth());
    dispatch(fetchVaultPasswordCounts());
    dispatch(fetchRecentActivity());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchPasswordActivity(range));
  }, [dispatch, range]);

  const handleAnalyzeAgain = () => {
    dispatch(fetchSecuritySummary());
    dispatch(fetchPasswordActivity(range));
    dispatch(fetchRecentPasswords());
    dispatch(fetchPasswordHealth());
    dispatch(fetchVaultPasswordCounts());
    dispatch(fetchRecentActivity());
  };

  const stats = [
    {
      label: 'Total Passwords',
      value: totalPasswords,
      subtext: 'Stored in vaults',
      valueClass: 'text-slate-900',
    },
    {
      label: 'Weak Passwords',
      value: weakPasswords,
      subtext: 'Need stronger passwords',
      valueClass: 'text-green-600',
    },
    {
      label: 'Old or Expired',
      value: oldPasswords,
      subtext: 'Consider updating soon',
      valueClass: 'text-yellow-600',
    },
    {
      label: 'Risks',
      value: riskPasswords,
      subtext: 'Potential security issues',
      valueClass: 'text-red-600',
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
              onClick={handleAnalyzeAgain}
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <PasswordTrendGraph
                  data={passwordTrend || []}
                  range={range}
                  onRangeChange={setRange}
                />
              </div>

              <SecurityScoreGraph
                securityScore={securityScore}
                weakPasswords={weakPasswords}
                oldPasswords={oldPasswords}
                riskPasswords={riskPasswords}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <h2 className={`text-4xl font-bold mt-3 ${item.valueClass}`}>
                    {item.value}
                  </h2>
                  <p className="text-sm text-slate-400 mt-2">{item.subtext}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PasswordHealthDonut data={passwordHealth || []} />
              <VaultWisePasswordCount data={vaultPasswordCounts || []} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-slate-900">
                  Recent Passwords
                </h3>

                <p className="text-slate-500 text-sm mt-1 mb-6">
                  Latest passwords included in your dashboard analysis
                </p>

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
                          <td className="px-5 py-4 font-medium text-slate-900">
                            {row.name}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {row.vault?.name || '-'}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {row.login}
                          </td>

                          <td className="px-5 py-4">{row.isWeak ? 'Yes' : 'No'}</td>
                          <td className="px-5 py-4">{row.isOld ? 'Yes' : 'No'}</td>
                          <td className="px-5 py-4">{row.isAtRisk ? 'Yes' : 'No'}</td>
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

              <RecentActivityTimeline data={recentActivity || []} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default DashboardPage;