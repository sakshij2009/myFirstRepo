import { useState, useMemo, useCallback } from 'react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import {
  Clock,
  CalendarSync,
  UserPlus,
  MapPin,
  AlertTriangle,
  Info,
  ChevronRight,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────
type NotifCategory = 'shifts' | 'schedule' | 'assignments' | 'system';
type NotifType =
  | 'shift-reminder'
  | 'schedule-change'
  | 'new-assignment'
  | 'checkin-reminder'
  | 'critical'
  | 'system';

type FilterTab = 'all' | NotifCategory;

interface Notification {
  id: string;
  type: NotifType;
  category: NotifCategory;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  urgent?: boolean;
  action?: { label: string; variant: 'solid' | 'outline'; route?: string };
  navigable?: boolean;
  group: 'today' | 'yesterday' | 'week' | 'earlier';
}

// ─── Icon / color config ──────────────────────────────────────────────
const typeConfig: Record<
  NotifType,
  { icon: typeof Clock; iconColor: string; iconBg: string }
> = {
  'shift-reminder': { icon: Clock, iconColor: '#1F6F43', iconBg: '#F0FDF4' },
  'schedule-change': { icon: CalendarSync, iconColor: '#1E5FA6', iconBg: '#EBF5FF' },
  'new-assignment': { icon: UserPlus, iconColor: '#5B21B6', iconBg: '#F3F0FF' },
  'checkin-reminder': { icon: MapPin, iconColor: '#92600A', iconBg: '#FFF8E1' },
  critical: { icon: AlertTriangle, iconColor: '#DC2626', iconBg: '#FEF2F2' },
  system: { icon: Info, iconColor: '#6B7280', iconBg: '#F3F4F6' },
};

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'system', label: 'System' },
];

const groupLabels: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  earlier: 'Earlier',
};

// ─── Mock Data ────────────────────────────────────────────────────────
const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'shift-reminder',
    category: 'shifts',
    title: 'Shift starting soon',
    description:
      'Your Respite Care shift with Emma Thompson begins at 9:00 AM. Location: 1234 Oak Street.',
    timestamp: '15 min ago',
    read: false,
    group: 'today',
    action: { label: 'Check In', variant: 'solid', route: '/shifts/1' },
  },
  {
    id: '2',
    type: 'new-assignment',
    category: 'assignments',
    title: 'New shift assigned',
    description:
      "You've been assigned a Supervised Visitation shift with Lucas Martinez on March 19.",
    timestamp: '1 hour ago',
    read: false,
    group: 'today',
    navigable: true,
  },
  {
    id: '3',
    type: 'critical',
    category: 'schedule',
    title: 'Schedule change — action required',
    description:
      'Your Emergency Care shift on March 16 has been moved from 2:00 PM to 4:00 PM. Please confirm.',
    timestamp: '3 hours ago',
    read: false,
    urgent: true,
    group: 'today',
    action: { label: 'Confirm', variant: 'solid' },
  },
  {
    id: '4',
    type: 'checkin-reminder',
    category: 'shifts',
    title: 'Check-in reminder',
    description:
      "Don't forget to check in for your Transportation shift with Sophia Kim at 3:00 PM.",
    timestamp: 'Yesterday at 2:45 PM',
    read: true,
    group: 'yesterday',
    navigable: true,
  },
  {
    id: '5',
    type: 'schedule-change',
    category: 'schedule',
    title: 'Shift completed',
    description:
      'Your Respite Care shift with Emma Thompson has been marked as completed. 4 hours logged.',
    timestamp: 'Yesterday at 1:05 PM',
    read: true,
    group: 'yesterday',
    navigable: true,
  },
  {
    id: '6',
    type: 'system',
    category: 'system',
    title: 'Availability reminder',
    description:
      'Please update your availability for the week of March 23. Deadline: March 18.',
    timestamp: 'March 12 at 9:00 AM',
    read: true,
    group: 'week',
    action: { label: 'Update', variant: 'outline', route: '/availability' },
  },
  {
    id: '7',
    type: 'new-assignment',
    category: 'assignments',
    title: 'New client added to your roster',
    description:
      "You've been assigned to work with a new client: Aiden Park (Emergency Care).",
    timestamp: 'March 11 at 2:30 PM',
    read: true,
    group: 'week',
    navigable: true,
  },
  {
    id: '8',
    type: 'system',
    category: 'system',
    title: 'Document expiring soon',
    description:
      'Your First Aid certification expires on April 1, 2026. Please upload your renewed certificate.',
    timestamp: 'March 10 at 10:00 AM',
    read: true,
    group: 'week',
    action: { label: 'Upload', variant: 'outline' },
  },
];

// ─── Component ────────────────────────────────────────────────────────
export function Notifications() {
  const navigate = useSafeNavigate();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  // Unread counts per category (for red dots on filter pills)
  const unreadByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    notifications
      .filter(n => !n.read)
      .forEach(n => {
        map[n.category] = (map[n.category] || 0) + 1;
      });
    return map;
  }, [notifications]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.category === activeFilter);
  }, [notifications, activeFilter]);

  // Group by time
  const grouped = useMemo(() => {
    const order = ['today', 'yesterday', 'week', 'earlier'] as const;
    return order
      .map(g => ({
        key: g,
        label: groupLabels[g],
        items: filtered.filter(n => n.group === g),
      }))
      .filter(g => g.items.length > 0);
  }, [filtered]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast('Marked all as read', {
      action: {
        label: 'Undo',
        onClick: () => setNotifications(initialNotifications),
      },
      duration: 3000,
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const handleNotifTap = useCallback(
    (notif: Notification) => {
      markRead(notif.id);
      if (notif.action?.route) {
        navigate(notif.action.route);
      } else if (notif.navigable) {
        navigate('/shifts/1');
      }
    },
    [markRead, navigate]
  );

  return (
    <div className="px-5 pb-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="pt-4 mb-0" style={{ minHeight: '56px' }}>
        <div className="flex items-center justify-between">
          <h1
            className="font-['Poppins'] font-bold text-[#1A1A1A]"
            style={{ fontSize: '20px' }}
          >
            Notifications
          </h1>
          {unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="font-['Inter'] font-medium text-[#1F6F43] active:opacity-70 transition-opacity"
              style={{ fontSize: '13px' }}
            >
              Mark All Read
            </button>
          ) : (
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors"
            >
              <Settings className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
            </button>
          )}
        </div>
        <p
          className="font-['Inter'] text-[#9CA3AF] mt-1"
          style={{ fontSize: '12px' }}
        >
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </p>
      </header>

      {/* ── Filter Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-2 mt-5 mb-4 overflow-x-auto no-scrollbar">
        {filterTabs.map(tab => {
          const isActive = activeFilter === tab.key;
          const hasUnread =
            tab.key !== 'all' &&
            !isActive &&
            (unreadByCategory[tab.key] || 0) > 0;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className="relative flex-shrink-0 font-['Inter'] transition-all"
              style={{
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                padding: '8px 18px',
                minHeight: '36px',
                borderRadius: '20px',
                backgroundColor: isActive ? '#1F6F43' : '#F3F4F6',
                color: isActive ? '#FFFFFF' : '#6B7280',
              }}
            >
              {tab.label}
              {hasUnread && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] bg-red-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notifications List ─────────────────────────────────────── */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              {/* Group header */}
              <h3
                className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3"
                style={{ fontSize: '13px' }}
              >
                {group.label}
              </h3>

              <div className="space-y-2">
                {group.items.map(notif => {
                  const cfg = typeConfig[notif.type];
                  const Icon = cfg.icon;
                  const isUnread = !notif.read;
                  const isUrgent = notif.urgent;

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifTap(notif)}
                      className="w-full text-left transition-all active:scale-[0.99]"
                      style={{
                        borderRadius: '14px',
                        padding: '16px',
                        paddingLeft: isUnread || isUrgent ? '13px' : '16px',
                        borderLeft: isUrgent
                          ? '3px solid #DC2626'
                          : isUnread
                          ? '3px solid #1F6F43'
                          : '3px solid transparent',
                        backgroundColor: isUnread
                          ? isUrgent
                            ? '#FFFBFB'
                            : '#FCFEFB'
                          : '#FFFFFF',
                        boxShadow: isUnread
                          ? '0 2px 8px rgba(0,0,0,0.04)'
                          : 'none',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon circle */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: cfg.iconBg }}
                        >
                          <Icon
                            className="w-[18px] h-[18px]"
                            style={{ color: cfg.iconColor }}
                            strokeWidth={2}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-['Inter'] text-[#1A1A1A] truncate"
                            style={{
                              fontSize: '14px',
                              fontWeight: isUnread ? 600 : 500,
                              color: isUnread ? '#1A1A1A' : '#374151',
                            }}
                          >
                            {notif.title}
                          </div>
                          <p
                            className="font-['Inter'] text-[#6B7280] mt-0.5"
                            style={{
                              fontSize: '13px',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {notif.description}
                          </p>
                          <span
                            className="font-['Inter'] text-[#9CA3AF] block mt-1"
                            style={{ fontSize: '11px' }}
                          >
                            {notif.timestamp}
                          </span>
                        </div>

                        {/* Right action / chevron */}
                        <div className="flex-shrink-0 flex items-center self-center ml-1">
                          {notif.action ? (
                            <span
                              className="font-['Inter'] font-semibold rounded-full flex items-center justify-center"
                              style={{
                                fontSize: '11px',
                                padding: '4px 12px',
                                height: '28px',
                                ...(notif.action.variant === 'solid'
                                  ? {
                                      backgroundColor: '#1F6F43',
                                      color: '#FFFFFF',
                                    }
                                  : {
                                      backgroundColor: 'transparent',
                                      color: '#1F6F43',
                                      border: '1px solid #1F6F43',
                                    }),
                              }}
                            >
                              {notif.action.label}
                            </span>
                          ) : notif.navigable ? (
                            <ChevronRight
                              className="w-3.5 h-3.5 text-[#D1D5DB]"
                              strokeWidth={2}
                            />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Empty State ───────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-24">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ border: '2px solid #D1D5DB' }}
          >
            <CheckCircle2 className="w-8 h-8 text-[#D1D5DB]" strokeWidth={1.5} />
          </div>
          <h3
            className="font-['Poppins'] font-semibold text-[#1A1A1A]"
            style={{ fontSize: '16px' }}
          >
            All caught up!
          </h3>
          <p
            className="font-['Inter'] text-[#9CA3AF] mt-2"
            style={{ fontSize: '14px' }}
          >
            You have no new notifications
          </p>
        </div>
      )}
    </div>
  );
}