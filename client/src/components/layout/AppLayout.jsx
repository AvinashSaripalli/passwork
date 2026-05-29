import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import VaultAutoLock from '../security/VaultAutoLock';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] flex">
      <VaultAutoLock />
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />

        {/* Main content */}
        <main className="p-6 flex-1">{children}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default AppLayout;