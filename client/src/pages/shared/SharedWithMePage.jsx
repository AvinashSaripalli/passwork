import { useEffect, useState } from 'react';
import { Eye, Globe, KeyRound, User } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import ViewSharedPasswordModal from './ViewSharedPasswordModal';
import { fetchSharedWithMe } from '../../features/sharedPasswords/sharedPasswordsSlice';

function SharedWithMePage() {
  const dispatch = useDispatch();

  const { sharedWithMe, loading, error } = useSelector(
    (state) => state.sharedPasswords
  );

  const [viewOpen, setViewOpen] = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);

  useEffect(() => {
    dispatch(fetchSharedWithMe());
  }, [dispatch]);

  const handleView = (item) => {
    setSelectedShare(item);
    setViewOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Shared With Me
          </h1>

          <p className="text-slate-500 mt-1">
            Passwords shared with you by other users
          </p>
        </div>

        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-500">
            Loading shared passwords...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {!loading && !sharedWithMe.length && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
            No passwords shared with you
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sharedWithMe.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <KeyRound size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {item.password?.name}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <User size={14} />
                    {item.password?.login}
                  </p>

                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 truncate">
                    <Globe size={14} />
                    {item.password?.url || 'No URL'}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    <p>
                      Shared by:{' '}
                      <span className="font-medium text-slate-700">
                        {item.sharedBy?.fullName}
                      </span>
                    </p>

                    <p className="mt-1">
                      Vault:{' '}
                      <span className="font-medium text-slate-700">
                        {item.password?.vault?.name || '-'}
                      </span>
                    </p>

                    <p className="mt-1">
                      Folder:{' '}
                      <span className="font-medium text-slate-700">
                        {item.password?.folder?.name || '-'}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleView(item)}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100"
                  >
                    <Eye size={15} />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ViewSharedPasswordModal
          open={viewOpen}
          item={selectedShare}
          onClose={() => {
            setViewOpen(false);
            setSelectedShare(null);
          }}
        />
      </div>
    </AppLayout>
  );
}

export default SharedWithMePage;