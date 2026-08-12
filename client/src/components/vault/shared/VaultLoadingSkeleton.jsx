function VaultLoadingSkeleton({ rows = 4 }) {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[72px] rounded-2xl bg-[var(--bg-skeleton)] animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export default VaultLoadingSkeleton;
