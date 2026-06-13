import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/* ────────────────────────────────────────────────────────── */
/*  Root Screen                                               */
/* ────────────────────────────────────────────────────────── */
export default function FinanceScreen() {
  const [activeView, setActiveView] = useState('billing');
  const [selectedAgency, setSelectedAgency] = useState(null);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F7F4" />

      {selectedAgency ? (
        <AgencyDetailView
          agency={selectedAgency}
          onBack={() => setSelectedAgency(null)}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* ── Header ── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>
                {activeView === 'billing' ? 'Billing' : 'Payroll'}
              </Text>
              <Text style={s.headerSub}>
                {activeView === 'billing'
                  ? 'Manage agency charges'
                  : 'Manage employee payments'}
              </Text>
            </View>
            <Pressable style={s.weekPill}>
              <Text style={s.weekPillText}>Weekly</Text>
              <Feather name="chevron-down" size={14} color="#666" />
            </Pressable>
          </View>

          {/* ── Segmented Control ── */}
          <View style={s.segWrapper}>
            <View style={s.segControl}>
              {['billing', 'payroll'].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveView(tab)}
                  style={[s.segBtn, activeView === tab && s.segBtnActive]}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      activeView === tab && s.segBtnTextActive,
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {activeView === 'billing' ? (
            <BillingView onSelectAgency={setSelectedAgency} />
          ) : (
            <PayrollView />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Billing View                                              */
/* ────────────────────────────────────────────────────────── */
function BillingView({ onSelectAgency }) {
  const router = useRouter();

  const summaryCards = [
    { label: 'Total Revenue', value: '$124,580', icon: 'trending-up', color: '#2F6B4F' },
    { label: 'Total Agencies', value: '12', icon: 'briefcase', color: '#4ECDC4' },
    { label: 'Total Clients', value: '248', icon: 'users', color: '#9D4EDD' },
  ];

  const agencies = [
    { id: '1', name: 'Government Agencies', type: 'Government', color: '#2F6B4F', revenue: '$68,420', clients: 142 },
    { id: '2', name: 'Private Agencies', type: 'Private', color: '#4ECDC4', revenue: '$42,180', clients: 86 },
    { id: '3', name: 'Non-Profit Organizations', type: 'Non-Profit', color: '#9D4EDD', revenue: '$13,980', clients: 20 },
  ];

  return (
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardRow}>
        {summaryCards.map((c, i) => (
          <SummaryCard key={i} {...c} />
        ))}
      </ScrollView>

      {/* Manage Agencies Button */}
      <Pressable style={s.manageRow} onPress={() => router.push('/admin/agencies')}>
        <View style={s.manageIcon}>
          <Feather name="home" size={20} color="#2F6B4F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.manageTitle}>Manage Agencies</Text>
          <Text style={s.manageSub}>View detailed agency billing & pricing</Text>
        </View>
        <Feather name="arrow-right" size={18} color="#666" />
      </Pressable>

      {/* Agency Categories */}
      <Text style={s.sectionLabel}>AGENCY CATEGORIES</Text>
      {agencies.map((agency) => (
        <AgencyCard key={agency.id} agency={agency} onSelect={() => onSelectAgency(agency)} />
      ))}
    </ScrollView>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Payroll View                                              */
/* ────────────────────────────────────────────────────────── */
function PayrollView() {
  const router = useRouter();

  const summaryCards = [
    { label: 'Total Payroll', value: '$89,450', icon: 'dollar-sign', color: '#2F6B4F' },
    { label: 'Total Employees', value: '32', icon: 'users', color: '#4ECDC4' },
    { label: 'Overtime Cost', value: '$12,840', icon: 'clock', color: '#FF9F1C' },
  ];

  const employees = [
    { id: '1', name: 'Benjamin Harris', employeeId: '1432569', status: 'Active', statusColor: '#10B981', shifts: 18, hours: 144, hourlyRate: 28.50, totalPay: 4104.00 },
    { id: '2', name: 'Sarah Johnson', employeeId: '1432570', status: 'Paid', statusColor: '#2F6B4F', shifts: 20, hours: 160, hourlyRate: 30.00, totalPay: 4800.00 },
    { id: '3', name: 'Emily Davis', employeeId: '1432571', status: 'Pending', statusColor: '#F59E0B', shifts: 15, hours: 120, hourlyRate: 26.00, totalPay: 3120.00 },
    { id: '4', name: 'James Wilson', employeeId: '1432572', status: 'Active', statusColor: '#10B981', shifts: 16, hours: 128, hourlyRate: 29.00, totalPay: 3712.00 },
  ];

  return (
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardRow}>
        {summaryCards.map((c, i) => (
          <SummaryCard key={i} {...c} />
        ))}
      </ScrollView>

      <Text style={s.sectionLabel}>EMPLOYEE PAYROLL</Text>
      {employees.map((emp) => (
        <EmployeePayrollCard
          key={emp.id}
          employee={emp}
          onViewDetails={() => router.push(`/finance/payroll/${emp.id}`)}
        />
      ))}
    </ScrollView>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Sub-components                                            */
/* ────────────────────────────────────────────────────────── */
function SummaryCard({ label, value, icon, color }) {
  return (
    <View style={s.summaryCard}>
      <View style={[s.summaryIconWrap, { backgroundColor: color + '22' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function AgencyCard({ agency, onSelect }) {
  return (
    <View style={s.agencyCard}>
      {/* Colored left bar */}
      <View style={[s.agencyBar, { backgroundColor: agency.color }]} />
      <View style={s.agencyBody}>
        <Text style={s.agencyName}>{agency.name}</Text>
        <View style={s.agencyMeta}>
          <Feather name="dollar-sign" size={13} color="#7A7A7A" />
          <Text style={[s.agencyRevenue, { color: '#2F6B4F' }]}>{agency.revenue}</Text>
          <Feather name="users" size={13} color="#7A7A7A" style={{ marginLeft: 12 }} />
          <Text style={s.agencyClients}>{agency.clients} clients</Text>
        </View>
      </View>
      <Pressable style={s.agencyArrowBtn} onPress={onSelect}>
        <Feather name="arrow-right" size={16} color="#666" />
      </Pressable>
    </View>
  );
}

function EmployeePayrollCard({ employee, onViewDetails }) {
  return (
    <View style={s.empCard}>
      {/* Top row */}
      <View style={s.empHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.empName}>{employee.name}</Text>
          <Text style={s.empId}>ID: {employee.employeeId}</Text>
        </View>
        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: employee.statusColor }]} />
          <Text style={[s.statusText, { color: employee.statusColor }]}>{employee.status}</Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        <View style={s.statCell}>
          <Text style={s.statLabel}>Total Shifts</Text>
          <Text style={s.statValue}>{employee.shifts} shifts</Text>
        </View>
        <View style={s.statCell}>
          <Text style={s.statLabel}>Total Hours</Text>
          <Text style={s.statValue}>{employee.hours} hrs</Text>
        </View>
        <View style={s.statCell}>
          <Text style={s.statLabel}>Salary/Hour</Text>
          <Text style={s.statValue}>${employee.hourlyRate.toFixed(2)}</Text>
        </View>
        <View style={s.statCell}>
          <Text style={s.statLabel}>Total Pay</Text>
          <Text style={[s.statValue, { color: '#2F6B4F' }]}>${employee.totalPay.toFixed(2)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.empActions}>
        <Pressable style={s.viewDetailsBtn} onPress={onViewDetails}>
          <Text style={s.viewDetailsBtnText}>View Details</Text>
        </Pressable>
        <Pressable style={s.editIconBtn}>
          <Feather name="edit-2" size={16} color="#666" />
        </Pressable>
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Agency Detail View                                        */
/* ────────────────────────────────────────────────────────── */
function AgencyDetailView({ agency, onBack }) {
  const clients = [
    { id: '1', caregiver: 'Sarah Johnson', revenue: '$150' },
    { id: '2', caregiver: 'David Kim', revenue: '$150' },
    { id: '3', caregiver: 'Amanda White', revenue: '$150' },
    { id: '4', caregiver: 'James Wilson', revenue: '$150' },
    { id: '5', caregiver: 'Peter England', revenue: '$150' },
  ];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.detailHeader}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Feather name="chevron-left" size={22} color="#1a1a1a" />
        </Pressable>
        <View style={[s.agencyInitialBadge, { backgroundColor: agency.color }]}>
          <Text style={s.agencyInitialText}>{agency.type.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.detailTitle}>{agency.type}</Text>
          <View style={s.agentBadge}><Text style={s.agentBadgeText}>1 Agent</Text></View>
        </View>
        <Pressable style={s.editPricingBtn}>
          <Feather name="edit-2" size={13} color="#fff" />
          <Text style={s.editPricingText}>Edit Pricing</Text>
        </Pressable>
      </View>

      <Text style={s.detailDesc}>
        View detailed information about {agency.type} category including clients, agencies and revenue.
      </Text>

      {/* Stats Row */}
      <View style={s.detailStatsRow}>
        {[
          { label: 'Total Clients', value: '12', sub: '11 Active', subColor: '#10B981', icon: 'users' },
          { label: 'Avg Per Client', value: '$150', sub: 'Avg Charge', subColor: '#7A7A7A', icon: 'dollar-sign' },
          { label: 'Total Revenue', value: '$2000', sub: 'All Agencies', subColor: '#7A7A7A', icon: 'trending-up' },
        ].map((stat, i) => (
          <View key={i} style={s.detailStatCard}>
            <Feather name={stat.icon} size={17} color="#7A7A7A" style={{ marginBottom: 8 }} />
            <Text style={s.detailStatLabel}>{stat.label}</Text>
            <Text style={s.detailStatValue}>{stat.value}</Text>
            <Text style={[s.detailStatSub, { color: stat.subColor }]}>{stat.sub}</Text>
          </View>
        ))}
      </View>

      {/* Caregivers Table */}
      <View style={s.tableCard}>
        <Text style={s.tableDesc}>All clients in the {agency.type.toLowerCase()} category.</Text>
        <View style={s.tableHeader}>
          <Text style={s.tableHeaderCell}>CAREGIVER</Text>
          <Text style={[s.tableHeaderCell, { textAlign: 'right' }]}>REVENUE</Text>
        </View>
        {clients.map((c, i) => (
          <View key={c.id} style={[s.tableRow, i !== clients.length - 1 && s.tableRowBorder]}>
            <Text style={s.tableCell}>{c.caregiver}</Text>
            <Text style={[s.tableCell, { fontWeight: '600', textAlign: 'right' }]}>{c.revenue}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Styles                                                    */
/* ────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F7F4' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  weekPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E1DC', borderRadius: 10, backgroundColor: '#fff' },
  weekPillText: { fontSize: 13, fontWeight: '500', color: '#555' },

  /* Segmented control */
  segWrapper: { paddingHorizontal: 20, paddingBottom: 12 },
  segControl: { flexDirection: 'row', backgroundColor: '#EDEBE8', borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  segBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  segBtnText: { fontSize: 14, fontWeight: '600', color: '#7A7A7A' },
  segBtnTextActive: { color: '#1a1a1a' },

  /* Scroll content */
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  cardRow: { gap: 12, paddingBottom: 16 },

  /* Summary card */
  summaryCard: { width: 148, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  summaryIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: '#7A7A7A' },

  /* Manage agencies row */
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  manageIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F9F7F4', justifyContent: 'center', alignItems: 'center' },
  manageTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  manageSub: { fontSize: 12, color: '#7A7A7A', marginTop: 2 },

  /* Section label */
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#7A7A7A', letterSpacing: 1, marginBottom: 12 },

  /* Agency card */
  agencyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, overflow: 'hidden' },
  agencyBar: { width: 4, borderRadius: 4, alignSelf: 'stretch', marginRight: 14 },
  agencyBody: { flex: 1 },
  agencyName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  agencyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agencyRevenue: { fontSize: 13, fontWeight: '600' },
  agencyClients: { fontSize: 13, color: '#666' },
  agencyArrowBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F9F7F4', justifyContent: 'center', alignItems: 'center' },

  /* Employee payroll card */
  empCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  empHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  empName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  empId: { fontSize: 12, color: '#7A7A7A' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCell: { width: '45%' },
  statLabel: { fontSize: 11, color: '#9A9A9A', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  empActions: { flexDirection: 'row', gap: 10 },
  viewDetailsBtn: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#2F6B4F', justifyContent: 'center', alignItems: 'center' },
  viewDetailsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editIconBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#E5E1DC', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  /* Agency detail */
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  agencyInitialBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  agencyInitialText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  agentBadge: { backgroundColor: '#4ECDC422', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  agentBadgeText: { fontSize: 11, fontWeight: '700', color: '#4ECDC4' },
  editPricingBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2F6B4F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  editPricingText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  detailDesc: { fontSize: 13, color: '#666', lineHeight: 20, paddingHorizontal: 20, marginBottom: 20 },
  detailStatsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  detailStatCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E1DC' },
  detailStatLabel: { fontSize: 10, fontWeight: '600', color: '#7A7A7A', marginBottom: 6 },
  detailStatValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  detailStatSub: { fontSize: 10, fontWeight: '600' },
  tableCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginHorizontal: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  tableDesc: { fontSize: 13, color: '#666', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E1DC', marginBottom: 4 },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: '#7A7A7A', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
  tableCell: { fontSize: 13, color: '#555' },
});
