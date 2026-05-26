import { Home, Calendar, Navigation, Bell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badgeCount?: number;
  onClick?: () => void;
}

function TabItem({ icon, label, isActive = false, badgeCount, onClick }: TabItemProps) {
  const color = isActive ? '#1F6F43' : '#9CA3AF';
  
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]">
      <div className="relative">
        {isActive && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-[3px] h-[3px] bg-[#1F6F43] rounded-full"></div>
        )}
        <div style={{ color }}>
          {icon}
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
          <div className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white rounded-full flex items-center justify-center font-['Inter'] font-bold" style={{ fontSize: '9px' }}>
            {badgeCount}
          </div>
        )}
      </div>
      <span className="font-['Inter'] font-medium" style={{ fontSize: '10px', color }}>
        {label}
      </span>
    </button>
  );
}

interface TabBarProps {
  activeTab?: 'Home' | 'Shifts' | 'Routes' | 'Alerts' | 'Profile';
}

export function TabBar({ activeTab: activeTabProp }: TabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab from location if not explicitly provided
  const activeTab = activeTabProp || (() => {
    if (location.pathname.startsWith('/notifications')) return 'Alerts';
    if (location.pathname.startsWith('/profile')) return 'Profile';
    if (location.pathname.startsWith('/routes')) return 'Routes';
    if (location.pathname.startsWith('/shifts')) return 'Shifts';
    return 'Home';
  })();
  
  const isOnAlerts = activeTab === 'Alerts';
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto h-[72px] bg-white flex items-start pt-2" style={{ borderTop: '0.5px solid #E5E7EB' }}>
      <TabItem 
        icon={<Home className="w-6 h-6" strokeWidth={2} />} 
        label="Home" 
        isActive={activeTab === 'Home'}
        onClick={() => navigate('/')}
      />
      <TabItem 
        icon={<Calendar className="w-6 h-6" strokeWidth={2} />} 
        label="Shifts" 
        isActive={activeTab === 'Shifts'}
        onClick={() => navigate('/shifts')}
      />
      <TabItem 
        icon={<Navigation className="w-6 h-6" strokeWidth={2} />} 
        label="Routes" 
        isActive={activeTab === 'Routes'}
        onClick={() => navigate('/routes')}
      />
      <TabItem 
        icon={<Bell className="w-6 h-6" strokeWidth={2} />} 
        label="Alerts" 
        isActive={activeTab === 'Alerts'}
        badgeCount={isOnAlerts ? 0 : 3}
        onClick={() => navigate('/notifications')}
      />
      <TabItem 
        icon={<User className="w-6 h-6" strokeWidth={2} />} 
        label="Profile" 
        isActive={activeTab === 'Profile'}
        onClick={() => navigate('/profile')}
      />
    </nav>
  );
}