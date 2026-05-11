import {
  Copy,
  Edit2,
  Eye,
  ExternalLink,
  KeyRound,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';

function MyVaultPasswordWorkspace({
  loading,
  passwords,
  selectedPasswordId,
  onSelectPassword,
  onViewPassword,
  onSharePassword,
  onEditPassword,
  onDeletePassword,
  onManageShares,
}) {
  const selectedPassword =
    passwords.find((item) => item.id === selectedPasswordId) || passwords[0];

  const copyText = (value) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 min-h-[600px] overflow-hidden">
      {loading ? (
        <div className="p-6 text-slate-500">Loading...</div>
      ) : passwords.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400">
          No passwords found
        </div>
      ) : (
        <div className="grid grid-cols-[330px_1fr] min-h-[600px]">
          <div className="border-r border-slate-200 p-5">
            <input
              placeholder="Search passwords..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none mb-5"
            />

            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {passwords.length} passwords
            </h2>

            <div className="space-y-3">
              {passwords.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectPassword(item.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selectedPassword?.id === item.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <h3 className="font-semibold text-slate-900 truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-500 truncate mt-1">
                    {item.login}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold text-slate-900">
                    {selectedPassword?.name}
                  </h1>

                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                    My Vault
                  </span>
                </div>

                <p className="text-slate-500 mt-2">
                  Personal password details
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onViewPassword(selectedPassword)}
                  className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                  title="View"
                >
                  <Eye size={18} />
                </button>

                <button
                  onClick={() => onEditPassword(selectedPassword)}
                  className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>

                <button
                  onClick={() => onDeletePassword(selectedPassword)}
                  className="w-11 h-11 rounded-full border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-7">
              <div className="mb-7">
                <h2 className="text-2xl font-semibold text-slate-900">
                  {selectedPassword?.login}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Account details</p>
              </div>

              <div className="space-y-0">
                <DetailRow
                  label="Login"
                  value={selectedPassword?.login}
                  onCopy={() => copyText(selectedPassword?.login)}
                />

                <DetailRow
                  label="Password"
                  value="••••••••••••"
                  onCopy={() => copyText(selectedPassword?.encryptedPassword)}
                />

                <DetailRow
                  label="URL"
                  value={selectedPassword?.url || 'No URL'}
                  link
                  onCopy={() => copyText(selectedPassword?.url)}
                />

                <DetailRow
                  label="Tags"
                  value={
                    selectedPassword?.tags?.length
                      ? selectedPassword.tags
                          .map((item) => item.tag?.name)
                          .filter(Boolean)
                          .join(', ')
                      : 'No tags'
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  onClick={() => onSharePassword(selectedPassword)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100"
                >
                  <Share2 size={16} />
                  Share Password
                </button>

                <button
                  onClick={() => onManageShares(selectedPassword)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                >
                  <Users size={16} />
                  Manage Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, onCopy, link }) {
  return (
    <div className="grid grid-cols-[160px_1fr_40px] items-center border-b border-slate-200 py-5 last:border-b-0">
      <p className="text-slate-500">{label}</p>

      <p className={`${link ? 'text-blue-600' : 'text-slate-900'} truncate`}>
        {value}
      </p>

      {onCopy && (
        <button
          onClick={onCopy}
          className="text-slate-500 hover:text-slate-900"
        >
          {link ? <ExternalLink size={17} /> : <Copy size={17} />}
        </button>
      )}
    </div>
  );
}

export default MyVaultPasswordWorkspace;