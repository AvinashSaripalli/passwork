function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500">
        
        {/* Left side */}
        <p className="text-slate-400">
          © {new Date().getFullYear()} Vaultix. All rights reserved.
        </p>

        {/* Right side (optional subtle branding) */}
        <p className="text-slate-400">
          Secure Password Management
        </p>

      </div>
    </footer>
  );
}

export default Footer;