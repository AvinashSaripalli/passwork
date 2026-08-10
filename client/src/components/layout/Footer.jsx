function Footer() {
  return (
    <footer className="bg-[var(--bg-footer)] border-t border-[var(--border-primary)] px-6 py-4 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
        
        {/* Left side */}
        <p className="text-[var(--text-muted)]">
          © {new Date().getFullYear()} Vaultix. All rights reserved.
        </p>

        {/* Right side (optional subtle branding) */}
        <p className="text-[var(--text-muted)]">
          Secure Password Management
        </p>

      </div>
    </footer>
  );
}

export default Footer;
