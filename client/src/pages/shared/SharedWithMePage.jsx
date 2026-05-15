import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Globe,
  KeyRound,
  Search,
  Share2,
  User,
  Folder,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import AppLayout from '../../components/layout/AppLayout';
import ViewSharedPasswordModal from './ViewSharedPasswordModal';
import { fetchSharedWithMe } from '../../features/sharedPasswords/sharedPasswordsSlice';

function SharedWithMePage() {
  const dispatch = useDispatch();

  const { sharedWithMe, loading, error } = useSelector(
    (state) => state.sharedPasswords
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);

  useEffect(() => {
    dispatch(fetchSharedWithMe());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const value = searchTerm.toLowerCase();

    return sharedWithMe.filter((item) => {
      return (
        item.password?.name?.toLowerCase().includes(value) ||
        item.password?.login?.toLowerCase().includes(value) ||
        item.password?.url?.toLowerCase().includes(value) ||
        item.sharedBy?.fullName?.toLowerCase().includes(value)
      );
    });
  }, [sharedWithMe, searchTerm]);

  const handleView = (item) => {
    setSelectedShare(item);
    setViewOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Share2 size={22} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Shared With Me
            </h1>
            <p className="text-slate-500 mt-1">
              Passwords shared with you by other users
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-1/4 min-w-[320px]">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search shared passwords..."
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-3">
                <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">Total Shared Passwords</p>
                  <p className="text-xl font-bold text-slate-900">
                    {sharedWithMe.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-slate-500">
              Loading shared passwords...
            </div>
          ) : error ? (
            <div className="m-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-600 text-sm">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-[420px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <KeyRound size={28} />
              </div>

              <h2 className="text-xl font-semibold text-slate-900">
                No shared passwords
              </h2>

              <p className="text-slate-500 mt-2">
                Passwords shared with you will appear here.
              </p>
            </div>
          ) : (
            <div>
              <div className="hidden lg:grid grid-cols-[1.5fr_1.2fr_1fr_1fr_130px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <p>Password</p>
                <p>URL</p>
                <p>Shared By</p>
                <p>Location</p>
                <p className="text-center">Action</p>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.2fr_1fr_1fr_130px] gap-4 items-center px-6 py-5 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <KeyRound size={20} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {item.password?.name}
                        </h3>

                        <p className="text-sm text-slate-500 flex items-center gap-2 truncate mt-1">
                          <User size={14} />
                          {item.password?.login || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="lg:hidden text-xs text-slate-400 mb-1">
                        URL
                      </p>
                      <p className="text-sm text-blue-600 truncate flex items-center gap-2">
                        <Globe size={14} />
                        {item.password?.url || 'No URL'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="lg:hidden text-xs text-slate-400 mb-1">
                        Shared By
                      </p>
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.sharedBy?.fullName || '-'}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="lg:hidden text-xs text-slate-400 mb-1">
                        Location
                      </p>
                      <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-2">
                        <Folder size={14} className="text-slate-400" />
                        {item.password?.vault?.name || '-'} /{' '}
                        {item.password?.folder?.name || '-'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleView(item)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700"
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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