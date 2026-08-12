function VaultWorkspaceShell({ children, className = '' }) {
  return (
    <div
      className={`vault-workspace rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-180px)] ${className}`}
    >
      {children}
    </div>
  );
}

export default VaultWorkspaceShell;
