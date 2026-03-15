import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

export default function IntakeFormViewScreen() {
  const router = useRouter();
  const { clientName } = useLocalSearchParams(); // e.g., ?clientName=Joseph%20Walker

  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [intakeData, setIntakeData] = useState(null);

  const [expandedSections, setExpandedSections] = useState({
    contactInfo: true,
    schoolInfo: true,
    eligibility: false,
    program: false,
    intakeAssessment: false,
    behavioralAssessment: false,
    emergencyContacts: true,
    servicePreferences: false,
    medicalInfo: false,
    transportation: false,
  });

  const [showFullBehavioral, setShowFullBehavioral] = useState(false);

  useEffect(() => {
    if (!clientName) {
      Alert.alert("Error", "No Client Name provided.");
      router.back();
      return;
    }
    fetchData();
  }, [clientName]);

  const fetchData = async () => {
    try {
      // 1. Fetch Client Basic Info
      const cq = query(collection(db, "clients"), where("name", "==", clientName));
      const cSnap = await getDocs(cq);
      let cData = null;
      if (!cSnap.empty) {
        cData = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
        setClientData(cData);
      }

      // 2. Fetch Intake Form Info based on name
      const iq = query(collection(db, "InTakeForms"), where("childsName", "==", clientName));
      const iSnap = await getDocs(iq);
      if (!iSnap.empty) {
        setIntakeData(iSnap.docs[0].data());
      }

      if (cSnap.empty && iSnap.empty) {
        Alert.alert("Not Found", "No data found for this client.");
      }

    } catch (e) {
      console.error("Fetch Error:", e);
      Alert.alert("Error", "Failed to load intake data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    );
  }

  // Pre-calculate safe fallbacks
  const cName = clientData?.name || intakeData?.childsName || clientName || 'Unknown';
  const cCode = clientData?.clientCode || intakeData?.cyimId || 'N/A';
  const cStatus = clientData?.clientStatus || 'Active';
  const cAvatar = clientData?.avatar;
  const initials = cName.substring(0, 2).toUpperCase();

  // Calculate completion percentage based on keys present (pseudo-logic)
  const totalKeys = intakeData ? Object.keys(intakeData).length : 0;
  const completionPercentage = totalKeys > 20 ? 92 : (totalKeys > 10 ? 65 : 30);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Sticky Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Pressable onPress={() => router.back()} style={s.iconBtn}>
            <Feather name="chevron-left" size={28} color="#333" />
          </Pressable>
          <Text style={s.headerTitle}>Intake Form</Text>
          <Pressable style={s.iconBtn}>
            <Feather name="more-vertical" size={24} color="#666" />
          </Pressable>
        </View>

        {/* Progress Indicator */}
        <View style={s.progressWrapper}>
          <View style={s.progressTextRow}>
            <Text style={s.progressLabel}>Intake Completion</Text>
            <Text style={s.progressValue}>{completionPercentage}%</Text>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${completionPercentage}%` }]} />
          </View>
        </View>

        {/* Client Summary Card */}
        <View style={s.clientCard}>
          <View style={s.clientCardRow}>
            <View style={[s.avatar, !cAvatar && { backgroundColor: '#4ECDC4' }]}>
              {cAvatar ? (
                <Image source={{ uri: cAvatar }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={s.clientInfo}>
              <Text style={s.clientName} numberOfLines={1}>{cName}</Text>
              <Text style={s.clientId}>ID: {cCode}</Text>
            </View>
            <View style={[s.statusBadge, cStatus === 'Inactive' && { backgroundColor: '#EF4444' }]}>
              <Text style={s.statusText}>{cStatus}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <SectionCard title="Contact Info" isExpanded={expandedSections.contactInfo} onToggle={() => toggleSection('contactInfo')}>
          <InfoRow label="Name" value={cName} />
          <InfoRow label="Gender" value={clientData?.gender || intakeData?.gender || "Not specified"} />
          <InfoRow label="Date of Birth" value={clientData?.dob || intakeData?.dateOfBirth || "Not specified"} />
          <InfoRow label="Address" value={clientData?.address || intakeData?.address || "Not specified"} />
          <InfoRow label="Email Address" value={clientData?.parentEmail || "Not specified"} isEmail />
          <InfoRow label="Phone Number" value={intakeData?.parentsPhone || "Not specified"} isPhone />
          <InfoRow label="Emergency Phone" value={intakeData?.emergencyPhone || "Not specified"} isPhone isLast />
        </SectionCard>

        <SectionCard title="School Information" isExpanded={expandedSections.schoolInfo} onToggle={() => toggleSection('schoolInfo')}>
          <InfoRow label="School Name" value={intakeData?.schoolName || "Not specified"} />
          <InfoRow label="School Address" value={intakeData?.schoolAddress || "Not specified"} />
          <InfoRow label="Teacher's Name" value={intakeData?.teacherName || "Not specified"} />
          <InfoRow label="School District" value={intakeData?.schoolDistrict || "Not specified"} isLast />
        </SectionCard>

        <SectionCard title="Program" isExpanded={expandedSections.program} onToggle={() => toggleSection('program')}>
          <InfoRow label="Service Request" value={intakeData?.typeOfService || "Not specified"} />
          <InfoRow label="Start Date" value={intakeData?.formStartDate || "Not specified"} />
          <InfoRow label="End Date" value={intakeData?.formEndDate || "Not specified"} isLast />
        </SectionCard>

        <SectionCard title="Intake Assessment" isExpanded={expandedSections.intakeAssessment} onToggle={() => toggleSection('intakeAssessment')}>
          <InfoRow label="Primary Diagnosis" value={intakeData?.childDiagnosis || "Not specified"} />
          <InfoRow label="Allergies" value={intakeData?.knownAllergies || "None reported"} />
          <InfoRow label="Medications" value={clientData?.medications?.[0]?.medicationName || "None reported"} />
          <InfoRow label="Care Needed" value={intakeData?.typeOfCareNeeded || "Not specified"} isLast />
        </SectionCard>

        <SectionCard title="Behavioral Assessment" isExpanded={expandedSections.behavioralAssessment} onToggle={() => toggleSection('behavioralAssessment')}>
          <View style={{ gap: 16, paddingBottom: 8 }}>
            <ParagraphBlock label="Behaviors of Concern" value={intakeData?.behaviorsOfConcern || "No particular behaviors noted. Ensure standard care and observation."} expanded={showFullBehavioral} />
            <ParagraphBlock label="Triggers" value={intakeData?.childsTriggers || "No specific triggers mapped. Standard routine should be followed."} expanded={showFullBehavioral} isLast />

            <Pressable onPress={() => setShowFullBehavioral(!showFullBehavioral)} style={s.viewMoreBtn}>
              <Text style={s.viewMoreText}>{showFullBehavioral ? 'View Less' : 'View More'}</Text>
            </Pressable>
          </View>
        </SectionCard>

      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={s.footer}>
        <View style={s.footerRow}>
          <Pressable
            style={s.footerBtnPrimary}
            onPress={() => Alert.alert("Coming Soon", "Edit Intake flow is not yet implemented.")}
          >
            <Feather name="edit" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.footerBtnPrimaryText}>Edit Intake</Text>
          </Pressable>

          <Pressable
            style={s.footerBtnSecondary}
            onPress={() => Alert.alert("Coming Soon", "PDF generation requires a native build.")}
          >
            <Feather name="download" size={16} color="#2F6B4F" style={{ marginRight: 8 }} />
            <Text style={s.footerBtnSecondaryText}>Download PDF</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ------------ COMPONENTS ------------ */

function SectionCard({ title, isExpanded, onToggle, children }) {
  return (
    <View style={s.sectionCard}>
      <Pressable onPress={onToggle} style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
      </Pressable>
      {isExpanded && (
        <View style={s.sectionBody}>
          {children}
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value, isPhone = false, isEmail = false, isLast = false }) {
  const handlePress = () => {
    if (isPhone && value !== "Not specified") Linking.openURL(`tel:${value}`);
    else if (isEmail && value !== "Not specified") Linking.openURL(`mailto:${value}`);
  };

  return (
    <View style={[s.infoRow, !isLast && s.infoRowBorder]}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={s.infoValueContainer}>
        <Text style={s.infoValue}>{value}</Text>
        {(isPhone || isEmail) && value !== "Not specified" && (
          <Pressable onPress={handlePress} style={s.actionIcon}>
            <Feather name={isPhone ? "phone" : "mail"} size={14} color="#2F6B4F" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ParagraphBlock({ label, value, expanded, isLast = false }) {
  const truncatedValue = value.length > 80 ? value.substring(0, 80) + '...' : value;
  const displayValue = expanded ? value : truncatedValue;

  return (
    <View style={[!isLast && s.infoRowBorder, { paddingBottom: isLast ? 0 : 16 }]}>
      <Text style={[s.infoLabel, { marginBottom: 4 }]}>{label}</Text>
      <Text style={[s.infoValue, { lineHeight: 22 }]}>{displayValue}</Text>
    </View>
  );
}


/* ------------ STYLES ------------ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },

  progressWrapper: { marginBottom: 12 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  progressValue: { fontSize: 12, fontWeight: '700', color: '#2F6B4F' },
  progressBarBg: { height: 8, backgroundColor: '#E5EAE8', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2F6B4F', borderRadius: 4 },

  clientCard: { backgroundColor: '#F6F8F7', borderRadius: 20, padding: 16 },
  clientCardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: '#fff' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 2 },
  clientId: { fontSize: 13, color: '#6B7280' },
  statusBadge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 100 },

  sectionCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16 },

  infoRow: { paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#E5EAE8' },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValueContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoValue: { fontSize: 15, color: '#333', flex: 1 },
  actionIcon: { padding: 8, backgroundColor: 'rgba(47, 107, 79, 0.1)', borderRadius: 8, marginLeft: 12 },

  viewMoreBtn: { width: '100%', paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(47, 107, 79, 0.05)', borderRadius: 8, marginTop: 8 },
  viewMoreText: { color: '#2F6B4F', fontSize: 13, fontWeight: '600' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E5EAE8', elevation: 20 },
  footerRow: { flexDirection: 'row', gap: 12 },
  footerBtnPrimary: { flex: 1, flexDirection: 'row', backgroundColor: '#2F6B4F', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  footerBtnSecondary: { flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderWidth: 2, borderColor: '#2F6B4F', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerBtnSecondaryText: { color: '#2F6B4F', fontSize: 14, fontWeight: '600' },
});
