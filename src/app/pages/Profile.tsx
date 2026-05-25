import { useState } from 'react';
import {
  Settings,
  Camera,
  Star,
  ChevronRight,
  Award,
  CreditCard,
  GraduationCap,
  Cross,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Lock,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import imgStaffPhoto from "figma:asset/1af2086220affecd5f498aeca93f64918a91bf86.png";
import imgLogo from "figma:asset/0d495a4b0b39eba28a6b72e320f92e9a00760e61.png";
import imgQrCode from "figma:asset/72e4462f590042cd762853a816e000ce1895aaad.png";

// ─── Data ─────────────────────────────────────────────────────────────
const personalDetails = [
  { label: 'Full Name', value: 'Sarah Catherine Johnson' },
  { label: 'Email', value: 'sarah.johnson@email.com', link: true },
  { label: 'Phone', value: '(555) 987-6543', link: true },
  { label: 'Date of Birth', value: 'June 15, 1994' },
  {
    label: 'Gender',
    value: 'Female',
    badge: { text: 'Female', bg: '#F3F0FF', color: '#5B21B6' },
  },
  { label: 'Address', value: '456 Birch Lane, Ontario' },
  { label: 'Start Date', value: 'March 1, 2024' },
];

const employmentDetails = [
  { label: 'Employee ID', value: 'EMP-2024-0087' },
  { label: 'CYIM ID', value: '1432569' },
  { label: 'Role', value: 'Intake Worker' },
  { label: 'Department', value: 'Field Services' },
  { label: 'Salary', value: '$24.50/hr' },
  {
    label: 'Status',
    value: 'Active',
    pill: { text: 'Active', bg: '#F0FDF4', color: '#1F6F43' },
  },
  { label: 'Supervisor', value: 'Jennifer Adams', link: true },
];

type DocStatus = 'valid' | 'expiring' | 'expired';

interface DocItem {
  name: string;
  detail: string;
  type: 'certificate' | 'id' | 'training' | 'medical';
  status: DocStatus;
}

const documents: DocItem[] = [
  {
    name: 'First Aid Certification',
    detail: 'Uploaded: Jan 15, 2026 · Expires: Apr 1, 2026',
    type: 'certificate',
    status: 'expiring',
  },
  {
    name: 'CPR Certification',
    detail: 'Uploaded: Feb 20, 2026 · Expires: Feb 20, 2027',
    type: 'certificate',
    status: 'valid',
  },
  {
    name: "Driver's License",
    detail: 'Uploaded: Dec 5, 2025 · Expires: Jun 15, 2028',
    type: 'id',
    status: 'valid',
  },
  {
    name: 'Child Safety Training',
    detail: 'Completed: Nov 10, 2025 · Annual renewal',
    type: 'training',
    status: 'valid',
  },
  {
    name: 'Vulnerable Sector Check',
    detail: 'Uploaded: Mar 1, 2024 · Expires: Mar 1, 2025',
    type: 'medical',
    status: 'expired',
  },
];

const docTypeConfig: Record<
  string,
  { icon: typeof Award; iconColor: string; iconBg: string }
> = {
  certificate: { icon: Award, iconColor: '#1F6F43', iconBg: '#F0FDF4' },
  id: { icon: CreditCard, iconColor: '#1E5FA6', iconBg: '#EBF5FF' },
  training: { icon: GraduationCap, iconColor: '#5B21B6', iconBg: '#F3F0FF' },
  medical: { icon: Cross, iconColor: '#DC2626', iconBg: '#FEF2F2' },
};

const statusConfig: Record<
  DocStatus,
  {
    icon: typeof CheckCircle2;
    iconColor: string;
    iconBg: string;
    accentColor: string | null;
  }
> = {
  valid: {
    icon: CheckCircle2,
    iconColor: '#1F6F43',
    iconBg: '#F0FDF4',
    accentColor: null,
  },
  expiring: {
    icon: AlertTriangle,
    iconColor: '#F59E0B',
    iconBg: '#FFF8E1',
    accentColor: '#F59E0B',
  },
  expired: {
    icon: XCircle,
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    accentColor: '#DC2626',
  },
};

const quickActions = [
  { icon: Lock, label: 'Change Password' },
  { icon: Bell, label: 'Notification Preferences' },
  { icon: Shield, label: 'Privacy & Security' },
  { icon: HelpCircle, label: 'Help & Support' },
  { icon: FileText, label: 'Terms & Policies' },
];

const stats = [
  { value: '148', label: 'Total Shifts' },
  { value: '592', label: 'Hours Logged' },
  { value: '4.9', label: 'Rating', star: true },
  { value: '2 yrs', label: 'Tenure' },
];

// ─── Reusable row renderer ───────────────────────────────────────────
function DetailRow({
  label,
  value,
  link,
  badge,
  pill,
  isLast,
}: {
  label: string;
  value: string;
  link?: boolean;
  badge?: { text: string; bg: string; color: string };
  pill?: { text: string; bg: string; color: string };
  isLast: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        minHeight: '40px',
        borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
        padding: '8px 0',
      }}
    >
      <span
        className="font-['Inter'] text-[#9CA3AF]"
        style={{ fontSize: '13px' }}
      >
        {label}
      </span>
      {pill ? (
        <span
          className="font-['Inter'] font-semibold rounded-full"
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            backgroundColor: pill.bg,
            color: pill.color,
          }}
        >
          {pill.text}
        </span>
      ) : badge ? (
        <div className="flex items-center gap-2">
          <span
            className="font-['Inter'] font-medium text-[#1A1A1A]"
            style={{ fontSize: '14px' }}
          >
            {value}
          </span>
          <span
            className="font-['Inter'] rounded-xl"
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: badge.bg,
              color: badge.color,
            }}
          >
            {badge.text}
          </span>
        </div>
      ) : (
        <span
          className="font-['Inter'] font-medium text-right"
          style={{
            fontSize: '14px',
            color: link ? '#1F6F43' : '#1A1A1A',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────
export function Profile() {
  const navigate = useSafeNavigate();
  const [avatarUrl] = useState(
    'https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzczNDM4NTY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  );

  const validCount = documents.filter(d => d.status === 'valid').length;
  const expiringCount = documents.filter(d => d.status === 'expiring').length;
  const expiredCount = documents.filter(d => d.status === 'expired').length;

  return (
    <div className="px-5 pb-[100px]">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between pt-4"
        style={{ minHeight: '56px' }}
      >
        <h1
          className="font-['Poppins'] font-bold text-[#1A1A1A]"
          style={{ fontSize: '20px' }}
        >
          Profile
        </h1>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: '#F3F4F6' }}
          onClick={() => toast('Account settings coming soon')}
        >
          <Settings className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
        </button>
      </header>

      {/* ── Profile Hero Card ───────────────────────────────────────── */}
      <div
        className="mt-5 bg-white"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
        }}
      >
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: '80px',
                height: '80px',
                border: '3px solid #1F6F43',
              }}
            >
              <img
                src={avatarUrl}
                alt="Sarah Johnson"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Camera overlay */}
            <button
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#1F6F43' }}
              onClick={() => toast('Photo upload coming soon')}
            >
              <Camera className="w-3 h-3 text-white" strokeWidth={2.5} />
            </button>
          </div>

          <h2
            className="font-['Poppins'] font-bold text-[#1A1A1A] mt-3 text-center"
            style={{ fontSize: '20px' }}
          >
            Sarah Johnson
          </h2>
          <p
            className="font-['Inter'] text-[#9CA3AF] mt-1 text-center"
            style={{ fontSize: '13px' }}
          >
            Staff · Intake Worker
          </p>
          <p
            className="font-['Inter'] text-[#9CA3AF] mt-1 text-center"
            style={{ fontSize: '12px' }}
          >
            Family Forever Inc.
          </p>

          {/* Badge pills */}
          <div className="flex items-center gap-2 mt-4">
            <span
              className="font-['Inter'] font-semibold rounded-full"
              style={{
                fontSize: '11px',
                padding: '4px 14px',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
              }}
            >
              CYIM: 1432569
            </span>
            <span
              className="font-['Inter'] font-semibold rounded-full"
              style={{
                fontSize: '11px',
                padding: '4px 14px',
                backgroundColor: '#F0FDF4',
                color: '#1F6F43',
              }}
            >
              Active
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="mt-5 pt-4 grid grid-cols-4"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className="flex flex-col items-center"
              style={{
                borderRight:
                  idx < stats.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div className="flex items-center gap-0.5">
                <span
                  className="font-['Poppins'] font-bold text-[#1A1A1A]"
                  style={{ fontSize: '18px' }}
                >
                  {stat.value}
                </span>
                {stat.star && (
                  <Star
                    className="w-2.5 h-2.5 fill-[#F59E0B] text-[#F59E0B]"
                    strokeWidth={0}
                  />
                )}
              </div>
              <span
                className="font-['Inter'] text-[#6B7280] mt-0.5 text-center"
                style={{ fontSize: '11px' }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Staff ID Card Preview ───────────────────────────────────── */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-['Poppins'] font-semibold text-[#1A1A1A]"
            style={{ fontSize: '14px' }}
          >
            Staff ID Card
          </h3>
          <button
            onClick={() => navigate('/profile/id-card')}
            className="font-['Inter'] font-medium text-[#1F6F43]"
            style={{ fontSize: '13px' }}
          >
            View Full Card &gt;
          </button>
        </div>

        {/* Compact card preview */}
        <button
          onClick={() => navigate('/profile/id-card')}
          className="w-full text-left transition-transform active:scale-[0.98]"
          style={{
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Green top half */}
          <div
            className="flex items-center justify-between px-4"
            style={{
              backgroundColor: '#1F6F43',
              height: '44px',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div className="flex items-center gap-2">
              <img src={imgLogo} alt="" className="w-5 h-5 object-cover" />
              <span
                className="font-['Poppins'] font-semibold text-white"
                style={{ fontSize: '12px' }}
              >
                Family Forever Inc.
              </span>
            </div>
            <span
              className="font-['Inter'] font-medium text-white/80"
              style={{ fontSize: '11px' }}
            >
              Employee ID 27
            </span>
          </div>

          {/* White bottom half */}
          <div
            className="flex items-center justify-between px-4 bg-white"
            style={{
              height: '56px',
              borderRadius: '0 0 16px 16px',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '2px solid #1F6F43' }}
              >
                <img
                  src={imgStaffPhoto}
                  alt="Sarah Johnson"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div
                  className="font-['Inter'] font-semibold text-[#1A1A1A]"
                  style={{ fontSize: '13px' }}
                >
                  Sarah Johnson
                </div>
                <div
                  className="font-['Inter'] text-[#9CA3AF]"
                  style={{ fontSize: '10px' }}
                >
                  Child and Youth Care Worker
                </div>
              </div>
            </div>
            <img
              src={imgQrCode}
              alt="QR"
              className="object-contain flex-shrink-0"
              style={{ width: '28px', height: '28px' }}
            />
          </div>
        </button>

        <p
          className="font-['Inter'] text-[#9CA3AF] text-center mt-2"
          style={{ fontSize: '11px' }}
        >
          Tap to show full card for parent verification
        </p>
      </div>

      {/* ── Personal Details Card ───────────────────────────────────── */}
      <div
        className="mt-4 bg-white"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-['Poppins'] font-semibold text-[#1A1A1A]"
            style={{ fontSize: '14px' }}
          >
            Personal Details
          </h3>
          <button
            className="font-['Inter'] font-medium text-[#1F6F43]"
            style={{ fontSize: '13px' }}
          >
            Edit &gt;
          </button>
        </div>
        {personalDetails.map((row, idx) => (
          <DetailRow
            key={row.label}
            label={row.label}
            value={row.value}
            link={row.link}
            badge={row.badge}
            isLast={idx === personalDetails.length - 1}
          />
        ))}
      </div>

      {/* ── Employment Card ─────────────────────────────────────────── */}
      <div
        className="mt-4 bg-white"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
        }}
      >
        <h3
          className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4"
          style={{ fontSize: '14px' }}
        >
          Employment
        </h3>
        {employmentDetails.map((row, idx) => (
          <DetailRow
            key={row.label}
            label={row.label}
            value={row.value}
            link={row.link}
            pill={row.pill}
            isLast={idx === employmentDetails.length - 1}
          />
        ))}
      </div>

      {/* ── Documents & Certifications ──────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-['Poppins'] font-semibold text-[#1A1A1A]"
            style={{ fontSize: '14px' }}
          >
            Documents & Certifications
          </h3>
          <button className="flex items-center gap-1">
            <Upload className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2} />
            <span
              className="font-['Inter'] font-medium text-[#1F6F43]"
              style={{ fontSize: '13px' }}
            >
              Upload
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {documents.map(doc => {
            const typeCfg = docTypeConfig[doc.type];
            const stCfg = statusConfig[doc.status];
            const TypeIcon = typeCfg.icon;
            const StatusIcon = stCfg.icon;

            return (
              <button
                key={doc.name}
                className="w-full flex items-center bg-white text-left overflow-hidden"
                style={{
                  borderRadius: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  padding: '16px',
                  borderLeft: stCfg.accentColor
                    ? `3px solid ${stCfg.accentColor}`
                    : '3px solid transparent',
                }}
              >
                {/* Type icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: typeCfg.iconBg }}
                >
                  <TypeIcon
                    className="w-[18px] h-[18px]"
                    style={{ color: typeCfg.iconColor }}
                    strokeWidth={2}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 ml-3">
                  <div
                    className="font-['Inter'] font-semibold text-[#1A1A1A] truncate"
                    style={{ fontSize: '14px' }}
                  >
                    {doc.name}
                  </div>
                  <div
                    className="font-['Inter'] text-[#9CA3AF] truncate mt-0.5"
                    style={{ fontSize: '12px' }}
                  >
                    {doc.detail}
                  </div>
                </div>

                {/* Status indicator */}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                  style={{ backgroundColor: stCfg.iconBg }}
                >
                  <StatusIcon
                    className="w-2.5 h-2.5"
                    style={{ color: stCfg.iconColor }}
                    strokeWidth={2.5}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Summary strip */}
        <div
          className="mt-4 flex items-center justify-center gap-1.5 flex-wrap"
          style={{
            backgroundColor: '#F0FDF4',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <span
            className="font-['Inter'] text-[#6B7280]"
            style={{ fontSize: '13px' }}
          >
            {documents.length} documents
          </span>
          <span className="text-[#D1D5DB]" style={{ fontSize: '13px' }}>
            ·
          </span>
          <span
            className="font-['Inter'] font-semibold text-[#1F6F43]"
            style={{ fontSize: '13px' }}
          >
            {validCount} valid
          </span>
          <span className="text-[#D1D5DB]" style={{ fontSize: '13px' }}>
            ·
          </span>
          <span
            className="font-['Inter'] font-semibold text-[#F59E0B]"
            style={{ fontSize: '13px' }}
          >
            {expiringCount} expiring
          </span>
          <span className="text-[#D1D5DB]" style={{ fontSize: '13px' }}>
            ·
          </span>
          <span
            className="font-['Inter'] font-semibold text-[#DC2626]"
            style={{ fontSize: '13px' }}
          >
            {expiredCount} expired
          </span>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <div className="mt-6">
        <h3
          className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4"
          style={{ fontSize: '14px' }}
        >
          Quick Actions
        </h3>
        <div
          className="bg-white overflow-hidden"
          style={{
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {quickActions.map((action, idx) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label}
                className="w-full flex items-center gap-3 text-left"
                style={{
                  height: '56px',
                  padding: '0 20px',
                  borderBottom:
                    idx < quickActions.length - 1
                      ? '1px solid #F3F4F6'
                      : 'none',
                }}
                onClick={() => toast(`${action.label} coming soon`)}
              >
                <ActionIcon
                  className="w-5 h-5 text-[#6B7280] flex-shrink-0"
                  strokeWidth={2}
                />
                <span
                  className="font-['Inter'] font-medium text-[#1A1A1A] flex-1"
                  style={{ fontSize: '14px' }}
                >
                  {action.label}
                </span>
                <ChevronRight
                  className="w-4 h-4 text-[#D1D5DB] flex-shrink-0"
                  strokeWidth={2}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sign Out ────────────────────────────────────────────────── */}
      <div className="mt-6">
        <button
          className="w-full flex items-center justify-center gap-2 transition-colors active:bg-[#FEF2F2]"
          style={{
            height: '48px',
            borderRadius: '12px',
            border: '1.5px solid #DC2626',
            backgroundColor: 'transparent',
          }}
          onClick={() => navigate('/login')}
        >
          <LogOut
            className="w-4 h-4 text-[#DC2626]"
            strokeWidth={2}
          />
          <span
            className="font-['Inter'] font-semibold text-[#DC2626]"
            style={{ fontSize: '14px' }}
          >
            Sign Out
          </span>
        </button>
        <p
          className="font-['Inter'] text-[#D1D5DB] text-center mt-2"
          style={{ fontSize: '11px' }}
        >
          Version 1.0.2
        </p>
      </div>
    </div>
  );
}