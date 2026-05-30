import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  KeyRound,
  LogIn,
  Share2,
  ShieldAlert,
  Activity,
  Folder,
  Database,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, setMasterVerified } from '../../features/auth/authSlice';
import api from '../../services/api';

function getItemIcon(type, meta) {
  if (type === 'LOGIN') {
    return {
      icon: <LogIn size={15} />,
      className:
        meta?.status === 'SUCCESS'
          ? 'bg-blue-50 text-blue-600'
          : 'bg-red-50 text-red-600',
    };
  }

  if (type === 'ACTIVITY') {
    const action = meta?.action || '';
    if (action.includes('PASSWORD'))
      return { icon: <KeyRound size={15} />, className: 'bg-amber-50 text-amber-600' };
    if (action.includes('FOLDER'))
      return { icon: <Folder size={15} />, className: 'bg-indigo-50 text-indigo-600' };
    if (action.includes('VAULT'))
      return { icon: <Database size={15} />, className: 'bg-slate-100 text-slate-600' };
    return { icon: <Activity size={15} />, className: 'bg-slate-100 text-slate-600' };
  }

  if (type === 'SHARE_PASSWORD' || type === 'SHARE_FOLDER' || type === 'SHARE_VAULT')
    return { icon: <Share2 size={15} />, className: 'bg-indigo-50 text-indigo-600' };

  if (type === 'SECURITY' || type === 'WEAK_PASSWORD')
    return { icon: <ShieldAlert size={15} />, className: 'bg-red-50 text-red-600' };

  if (type === 'PASSWORD')
    return { icon: <KeyRound size={15} />, className: 'bg-amber-50 text-amber-600' };

  return { icon: <Bell size={15} />, className: 'bg-slate-100 text-slate-600' };
}

function getTypeBadge(type) {
  if (type === 'LOGIN')
    return { label: 'Login', className: 'bg-blue-50 text-blue-600' };
  if (type === 'ACTIVITY')
    return { label: 'Action', className: 'bg-slate-100 text-slate-500' };
  return { label: 'Alert', className: 'bg-indigo-50 text-indigo-600' };
}

function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isMasterVerified } = useSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  const fetchRecentActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const lastViewed = localStorage.getItem('lastViewedAt');
      if (lastViewed) {
        params.since = lastViewed;
      }
      const res = await api.get('/notifications/recent-activity', { params });
      setItems(res.data?.items || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('fetchRecentActivity error:', err);
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();
    const interval = setInterval(fetchRecentActivity, 10000);
    return () => clearInterval(interval);
  }, [fetchRecentActivity]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (item) => {
    if (item.type !== 'ACTIVITY' && item.type !== 'LOGIN') {
      try {
        await api.patch(`/notifications/${item.sourceId}/read`);
      } catch (err) {
        console.error('markAsRead error:', err);
      }
    }
    localStorage.setItem('lastViewedAt', new Date().toISOString());
    fetchRecentActivity();
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
    } catch (err) {
      console.error('markAllRead error:', err);
    }
    localStorage.setItem('lastViewedAt', new Date().toISOString());
    fetchRecentActivity();
  };

  const activityCount = items.filter((i) => i.type === 'ACTIVITY').length;
  const loginCount = items.filter((i) => i.type === 'LOGIN').length;
  const alertCount = items.filter(
    (i) => i.type !== 'ACTIVITY' && i.type !== 'LOGIN'
  ).length;

  const handleOpen = () => {
    if (!open) {
      fetchRecentActivity();
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-8">
      <h2 className="text-sm font-semibold text-slate-700">Password Manager</h2>

      <div className="flex items-center gap-5">
        {isMasterVerified && (
          <button
            onClick={() => dispatch(setMasterVerified(false))}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Lock Vault
          </button>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleOpen}
            className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition"
          >
            <Bell size={18} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[400px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-slate-900 text-sm">Recent Activity</h3>
                  {unreadCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchRecentActivity}
                    disabled={loading}
                    className="text-slate-400 hover:text-slate-600 transition"
                    title="Refresh"
                  >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate('/activity-log?tab=unread');
                    }}
                    className="text-xs text-slate-500 font-medium hover:text-slate-700 transition"
                  >
                    View all →
                  </button>
                </div>
              </div>

              {/* Items list */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
                {loading && items.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Loading...
                  </div>
                )}

                {!loading && items.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No recent activity.
                  </div>
                )}

                {items.map((item) => {
                  const { icon, className: iconClass } = getItemIcon(item.type, item.meta);
                  const { label: badgeLabel, className: badgeClass } = getTypeBadge(item.type);
                  const isUnread = !item.isRead;

                  return (
                    <button
                      key={item.id}
                      onClick={() => markAsRead(item)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition flex items-start gap-3 ${
                        isUnread ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconClass}`}
                      >
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                          )}
                          {!isUnread && item.type !== 'ACTIVITY' && item.type !== 'LOGIN' && (
                            <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                          )}
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {item.title}
                          </p>
                        </div>
                        {item.message && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {item.message}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Type badge */}
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer summary */}
              <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                <p className="text-[11px] text-slate-400">
                  {activityCount} actions · {loginCount} logins · {alertCount} alerts
                </p>
                <p className="text-[11px] font-semibold text-slate-600">
                  {unreadCount} unread
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User avatar with dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="leading-tight text-left">
              <p className="text-sm font-semibold text-slate-900">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-slate-500">{user?.email || ''}</p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition font-medium"
              >
                Profile
              </button>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  dispatch(logout());
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Topbar;