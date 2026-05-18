import { useEffect, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setMasterVerified } from '../../features/auth/authSlice';
import api from '../../services/api';

function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, isMasterVerified } = useSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/recent');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      setNotifications([]);
    }
  };

  const markAsRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    fetchNotifications();
  };

  return (
    <div className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-8">
      <h2 className="text-sm font-semibold text-slate-700">
        Password Manager
      </h2>

      <div className="flex items-center gap-5">
        {isMasterVerified && (
          <button
            onClick={() => dispatch(setMasterVerified(false))}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Lock Vault
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="relative h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
          >
            <Bell size={18} className="text-slate-600" />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[360px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Notifications</h3>

                <button
                  onClick={() => {
                    setOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-sm text-indigo-600 font-medium"
                >
                  View All
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 ${
                      !item.isRead ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!item.isRead ? (
                        <span className="h-2 w-2 rounded-full bg-indigo-600 mt-2" />
                      ) : (
                        <CheckCircle2
                          size={14}
                          className="text-green-500 mt-1"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {item.message}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-2">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {!notifications.length && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">
              {user?.fullName || 'User'}
            </p>

            <p className="text-xs text-slate-500">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Topbar;