import { Search } from 'lucide-react';

function VaultSearchInput({ value, onChange, placeholder = 'Search items...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="vault-search-input w-full pl-10 pr-4 py-2.5 text-sm"
      />
    </div>
  );
}

export default VaultSearchInput;
