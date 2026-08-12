import { Copy, ExternalLink, Eye, EyeOff } from 'lucide-react';

function VaultDetailField({
  label,
  value,
  masked = false,
  isVisible = false,
  onToggleVisible,
  onCopy,
  href,
  className = '',
}) {
  const displayValue =
    masked && !isVisible ? '••••••••••••' : value || '—';

  return (
    <div className={`vault-detail-field group ${className}`}>
      <p className="vault-detail-label">{label}</p>

      <div className="vault-detail-value min-w-0">
        {href && value ? (
          <a
            href={href.startsWith('http') ? href : `https://${href}`}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 break-all hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className={`break-all ${!value ? 'text-[var(--text-muted)]' : ''}`}>
            {displayValue}
          </span>
        )}
      </div>

      <div className="vault-detail-actions">
        {masked && onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="vault-icon-btn"
            title={isVisible ? 'Hide' : 'Reveal'}
          >
            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {onCopy && (
          <button type="button" onClick={onCopy} className="vault-icon-btn" title="Copy">
            <Copy size={16} />
          </button>
        )}
        {href && value && (
          <a
            href={href.startsWith('http') ? href : `https://${href}`}
            target="_blank"
            rel="noreferrer"
            className="vault-icon-btn"
            title="Open link"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

export default VaultDetailField;
