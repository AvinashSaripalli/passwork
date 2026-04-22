import Sidebar from './Sidebar';
import Topbar from './Topbar';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;