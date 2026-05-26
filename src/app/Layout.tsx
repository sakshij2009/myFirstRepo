import { Outlet, useLocation } from 'react-router';
import { TabBar } from './components/TabBar';

export function Layout() {
  const location = useLocation();
  const isFullScreenWizard = location.pathname.includes('/transfer') || location.pathname.includes('/id-card') || location.pathname.includes('/clock-in') || location.pathname.includes('/clock-out') || location.pathname.includes('/gps-unavailable') || location.pathname.includes('/intake-form') || location.pathname.includes('/complete-shift');

  if (isFullScreenWizard) {
    return <Outlet />;
  }

  return (
    <div className="w-full h-screen max-w-[390px] mx-auto bg-[#F8F8F6] flex flex-col overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-[72px]">
        <Outlet />
      </div>
      
      {/* Bottom Tab Bar */}
      <TabBar />
    </div>
  );
}