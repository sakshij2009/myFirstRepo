import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../src/firebase/config';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';

import MedicationTab from '../../../MedicationTab';
import ReportTransportationTab from '../../../ReportTransportationTab';

export default function ReportWritingScreen() {
  const router = useRouter();
  const { id: shiftId } = useLocalSearchParams();

  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [reportText, setReportText] = useState('');
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const loadShift = async () => {
      try {
        const ref = doc(db, 'shifts', String(shiftId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setShift({ id: snap.id, ...data });
          if (data.shiftReport) setReportText(data.shiftReport);
          if (data.reportSubmitted) setIsSubmitted(true);
        }
      } catch (e) {
        console.log("Error loading shift", e);
      } finally {
        setLoading(false);
      }
    };
    if (shiftId) loadShift();
  }, [shiftId]);

  const submitReport = async () => {
    if (!reportText.trim()) {
      Alert.alert("Error", "Report description is required.");
      return;
    }
    try {
      await updateDoc(doc(db, "shifts", String(shiftId)), {
        shiftReport: reportText,
        reportSubmitted: true,
      });
      setIsSubmitted(true);
      Alert.alert("Success", "Report submitted!");
    } catch (e) {
      Alert.alert("Error", "Failed to submit report.");
    }
  };

  const handleDownload = async () => {
    Alert.alert("Coming Soon", "PDF downloading requires native module builds. This feature will be enabled in a future update.");
  };

  const formatTime = (time) => {
    if (!time) return "--";
    try {
      const dateObj = new Date(time);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) { }
    return time;
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    );
  }

  const client = {
    name: shift?.clientName || 'Joseph',
    id: shift?.clientId || '6587879',
    avatar: shift?.clientName ? shift.clientName.substring(0, 2).toUpperCase() : 'JW',
    category: shift?.categoryName || 'Respite Care',
    categoryColor: '#4ECDC4',
    dob: shift?.dob || '18-July-2020',
    medicalConditions: ['Osteoarthritis', 'Type 2 diabetes', 'Major depressive disorder', 'Asthma', 'Hypertension'],
  };

  const staff = {
    name: shift?.name || 'Benjamin Harris',
    id: shift?.userId || '987654321',
    avatar: shift?.name ? shift.name.substring(0, 2).toUpperCase() : 'BH',
  };

  const calculateHours = (inTime, outTime) => {
    if (!inTime || !outTime) return "N/A";
    let start = new Date(inTime);
    let end = new Date(outTime);
    if (isNaN(start) || isNaN(end)) return "--";
    let diff = end.getTime() - start.getTime();
    if (diff < 0) diff += 24 * 3600 * 1000;
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs} Hours ${mins} Mins`;
  };

  const reportInfo = {
    title: 'Report 1',
    date: shift?.startDate ? new Date(shift.startDate).toLocaleDateString() : '10/02/2001',
    staffName: staff.name,
    staffId: staff.id,
    clientName: client.name,
    shiftTime: `${formatTime(shift?.startTime)} - ${formatTime(shift?.endTime)}`,
    clockIn: shift?.clockIn ? formatTime(shift.clockIn) : '9:30 AM',
    clockInLocation: shift?.clockInLocation || 'Ontario, 15 BH Street',
    clockOut: shift?.clockOut ? formatTime(shift.clockOut) : '10:30 PM',
    clockOutLocation: shift?.clockOutLocation || 'Ontario, 20 Main Street',
    totalHours: calculateHours(shift?.clockIn, shift?.clockOut),
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </Pressable>
        <View style={s.headerTextContainer}>
          <Text style={s.headerTitle}>Reports</Text>
          <Text style={s.headerSubtitle}>kibo Gin | Intake Worker</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Client Info Toggle */}
        <View style={s.clientInfoSection}>
          <Pressable onPress={() => setShowClientInfo(!showClientInfo)} style={s.clientInfoToggle}>
            <View style={s.clientInfoLeft}>
              <View style={[s.avatar, { backgroundColor: client.categoryColor }]}>
                <Text style={s.avatarText}>{client.avatar}</Text>
              </View>
              <View>
                <Text style={s.clientName}>{client.name}</Text>
                <Text style={s.clientId}>ID: {client.id}</Text>
              </View>
            </View>
            <Feather name={showClientInfo ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
          </Pressable>

          {showClientInfo && (
            <View style={s.clientInfoExpanded}>
              <View style={s.expandedBlock}>
                <View style={[s.categoryBadge, { backgroundColor: client.categoryColor }]}>
                  <Text style={s.categoryBadgeText}>{client.category}</Text>
                </View>
                <Text style={s.clientDob}>DOB: {client.dob}</Text>
              </View>

              <View style={s.expandedBlock}>
                <Text style={s.expandedTitle}>Medical Conditions</Text>
                {client.medicalConditions.slice(0, 3).map((cond, i) => (
                  <Text key={i} style={s.conditionText}>• {cond}</Text>
                ))}
                {client.medicalConditions.length > 3 && (
                  <Text style={s.moreText}>+ {client.medicalConditions.length - 3} more</Text>
                )}
              </View>

              <View style={s.expandedBlock}>
                <Text style={s.expandedTitle}>Primary Staff</Text>
                <View style={s.clientInfoLeft}>
                  <View style={[s.avatar, { backgroundColor: '#9D4EDD', width: 32, height: 32 }]}>
                    <Text style={[s.avatarText, { fontSize: 12 }]}>{staff.avatar}</Text>
                  </View>
                  <View>
                    <Text style={s.staffName}>{staff.name}</Text>
                    <Text style={s.staffId}>ID: {staff.id}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={s.tabsContainer}>
          {['reports', 'medications', 'transportations'].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={s.tabContent}>
          {activeTab === 'medications' ? (
            <MedicationTab />
          ) : activeTab === 'transportations' ? (
            <ReportTransportationTab />
          ) : (
            <>
              {/* Report Header */}
              <View style={s.card}>
                <Text style={s.cardTitle}>{reportInfo.title}</Text>
                <View style={s.reportItem}><Text style={s.reportItemLabel}>📅 Date:</Text><Text style={s.reportItemValue}>{reportInfo.date}</Text></View>
                <View style={s.reportItem}><Text style={s.reportItemLabel}>👤 Staff Name:</Text><Text style={s.reportItemValue}>{reportInfo.staffName}</Text></View>
                <View style={s.reportItem}><Text style={s.reportItemLabel}>🆔 Staff ID:</Text><Text style={s.reportItemValue}>{reportInfo.staffId}</Text></View>
                <View style={s.reportItem}><Text style={s.reportItemLabel}>👤 Client Name:</Text><Text style={s.reportItemValue}>{reportInfo.clientName}</Text></View>
                <View style={s.reportItem}><Text style={s.reportItemLabel}>🕐 Shift Time:</Text><Text style={s.reportItemValue}>{reportInfo.shiftTime}</Text></View>
              </View>

              {/* Shift Timeline */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Shift Timeline</Text>

                <View style={s.timelineRow}>
                  <View style={[s.timelineIconWrap, { backgroundColor: '#10B981' }]}>
                    <Feather name="check" size={16} color="#fff" />
                  </View>
                  <View style={s.timelineDetails}>
                    <Text style={s.timelineTitle}>Clock In</Text>
                    <Text style={s.timelineText}>{reportInfo.clockIn}</Text>
                    <Text style={s.timelineText}>{reportInfo.clockInLocation}</Text>
                  </View>
                </View>

                <View style={s.timelineRow}>
                  <View style={[s.timelineIconWrap, { backgroundColor: '#EF4444' }]}>
                    <Feather name="check" size={16} color="#fff" />
                  </View>
                  <View style={s.timelineDetails}>
                    <Text style={s.timelineTitle}>Clock Out</Text>
                    <Text style={s.timelineText}>{reportInfo.clockOut}</Text>
                    <Text style={s.timelineText}>{reportInfo.clockOutLocation}</Text>
                  </View>
                </View>

                <View style={s.timelineFooter}>
                  <Text style={s.timelineTotalLabel}>Total Hours:</Text>
                  <Text style={s.timelineTotalValue}>{reportInfo.totalHours}</Text>
                </View>
              </View>

              {/* Daily Shift Report form */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Daily Shift Report</Text>
                <Text style={s.reportHelpText}>
                  Include details about: activities, medications, meals, mood, interactions, health observations, and any concerns.
                </Text>
                <TextInput
                  style={s.textArea}
                  multiline
                  placeholder="Begin your report"
                  value={reportText}
                  onChangeText={setReportText}
                  editable={!isSubmitted}
                  textAlignVertical="top"
                />
                <Text style={s.charCount}>Character count: {reportText.length}</Text>
              </View>

              {/* Action Buttons */}
              <View style={s.actionBtnsRow}>
                <Pressable style={s.downloadBtn} onPress={handleDownload}>
                  <Feather name="download" size={18} color="#2D5F3F" />
                  <Text style={s.downloadBtnText}>Download</Text>
                </Pressable>
                {!isSubmitted ? (
                  <Pressable style={s.submitBtn} onPress={submitReport}>
                    <Text style={s.submitBtnText}>Submit</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[s.submitBtn, { backgroundColor: '#ccc' }]} disabled>
                    <Text style={s.submitBtnText}>Submitted</Text>
                  </Pressable>
                )}
              </View>

              {/* Other Actions */}
              <View style={s.otherActionsSection}>
                <Text style={s.cardTitle}>Other Actions</Text>
                <ActionCard
                  icon="alert-triangle"
                  title="Critical Incident Reporting"
                  description="For serious incident requiring immediate management attention"
                  buttonText="Report Critical Incident"
                  borderColor="#EF4444"
                  buttonColor="#EF4444"
                  usage="Self-harm, violence, abuse allegations, serious accidents..."
                  onPress={() => router.push(`/admin/shift-report/${shiftId}/incidents/critical`)}
                />
                <ActionCard
                  icon="file-text"
                  title="Medical Contact Log"
                  description="Document medical-related contacts, incidents, or communications."
                  buttonText="Contact Note"
                  borderColor="#3B82F6"
                  buttonColor="#3B82F6"
                  usage="Medical incidents, emergency care, medication errors..."
                  onPress={() => router.push(`/admin/shift-report/${shiftId}/incidents/contact`)}
                />
                <ActionCard
                  icon="bell"
                  title="Noteworthy Event"
                  description="Record significant or critical incidents involving a client."
                  buttonText="Noteworthy Event"
                  borderColor="#FF9F1C"
                  buttonColor="#FF9F1C"
                  usage="Use this form only when the situation is a noteworthy event..."
                  onPress={() => router.push(`/admin/shift-report/${shiftId}/incidents/noteworthy`)}
                />
                <ActionCard
                  icon="check-circle"
                  title="Follow through"
                  description="Document follow-up actions, outcomes, or ongoing tasks."
                  buttonText="Follow Through"
                  borderColor="#2D5F3F"
                  buttonColor="#2D5F3F"
                  usage="Recording follow-up activities, actions taken, or outcomes..."
                  onPress={() => router.push(`/admin/shift-report/${shiftId}/incidents/follow`)}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, title, description, buttonText, borderColor, buttonColor, usage, onPress }) {
  return (
    <View style={[s.actionCard, { borderColor }]}>
      <View style={s.actionCardTop}>
        <View style={s.actionCardIconWrap}>
          <Feather name={icon} size={20} color={borderColor} />
        </View>
        <View style={s.actionCardInfo}>
          <Text style={s.actionCardTitle}>{title}</Text>
          <Text style={s.actionCardDesc}>{description}</Text>
          <Text style={s.actionCardUsage}>{usage}</Text>
        </View>
      </View>
      <Pressable style={[s.actionBtn, { backgroundColor: buttonColor }]} onPress={onPress}>
        <Text style={s.actionBtnText}>{buttonText}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F9F7F4', borderBottomWidth: 1, borderBottomColor: '#EAE6DF' },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerTextContainer: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666' },

  clientInfoSection: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAE6DF' },
  clientInfoToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  clientInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clientName: { fontSize: 14, fontWeight: '700', color: '#333' },
  clientId: { fontSize: 12, color: '#666' },

  clientInfoExpanded: { padding: 16, paddingTop: 0 },
  expandedBlock: { marginBottom: 12 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  categoryBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  clientDob: { fontSize: 12, color: '#666', marginTop: 8 },
  expandedTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  conditionText: { fontSize: 12, color: '#666', marginBottom: 2 },
  moreText: { fontSize: 12, color: '#2D5F3F', fontWeight: '600', marginTop: 4 },
  staffName: { fontSize: 14, fontWeight: '600', color: '#333' },
  staffId: { fontSize: 12, color: '#666' },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAE6DF' },
  tabBtn: { flex: 1, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' },
  tabBtnActive: { borderBottomColor: '#2D5F3F' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666', textTransform: 'capitalize' },
  tabTextActive: { color: '#2D5F3F' },

  tabContent: { padding: 16, gap: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reportItemLabel: { fontSize: 13, color: '#666' },
  reportItemValue: { fontSize: 13, color: '#333', fontWeight: '500' },

  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timelineIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  timelineDetails: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  timelineText: { fontSize: 12, color: '#666', marginTop: 2 },
  timelineFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineTotalLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  timelineTotalValue: { fontSize: 14, fontWeight: '700', color: '#2D5F3F' },

  reportHelpText: { fontSize: 12, color: '#666', marginBottom: 12 },
  textArea: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EAE6DF', borderRadius: 8, padding: 12, minHeight: 180, fontSize: 14 },
  charCount: { fontSize: 12, color: '#666', marginTop: 8 },

  actionBtnsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  downloadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 2, borderColor: '#2D5F3F', borderRadius: 8 },
  downloadBtnText: { color: '#2D5F3F', fontWeight: '700', fontSize: 14 },
  submitBtn: { flex: 1, backgroundColor: '#2D5F3F', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  otherActionsSection: { marginTop: 8 },
  actionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 2, marginBottom: 12 },
  actionCardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionCardIconWrap: { marginTop: 2 },
  actionCardInfo: { flex: 1 },
  actionCardTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  actionCardDesc: { fontSize: 12, color: '#666', marginBottom: 6 },
  actionCardUsage: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  actionBtn: { width: '100%', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});
