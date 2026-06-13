import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Dimensions, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Switch } from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../src/firebase/config';

const { width, height } = Dimensions.get('window');

const categories = [
  { id: 'all', label: 'All' },
  { id: 'Respite Care', label: 'Respite Care' },
  { id: 'Emergent Care', label: 'Emergent Care' },
  { id: 'Supervised Visitation', label: 'Supervised Visitations' },
  { id: 'Transportation', label: 'Transportations' },
];

export default function ShiftsScreen({ isDarkMode = false }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allShifts, setAllShifts] = useState([]);
  const [transports, setTransports] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [monthDays, setMonthDays] = useState([]);

  const [activeTab, setActiveTab] = useState('shifts');
  const [currentMonth, setCurrentMonth] = useState('');
  const [currentDateState, setCurrentDateState] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate().toString());
  const [calendarView, setCalendarView] = useState('week');

  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const getShiftStatus = (clockIn, clockOut) => {
    if (clockIn && clockOut) return "Completed";
    if (clockIn && !clockOut) return "Ongoing";
    return "Incomplete";
  };

  const getCategoryColor = (cat) => {
    if (!cat) return '#4ECDC4';
    if (cat.includes('Respite')) return '#4ECDC4';
    if (cat.includes('Emergent')) return '#FF4D6D';
    if (cat.includes('Visitation')) return '#9D4EDD';
    if (cat.includes('Transportation')) return '#FFB703';
    return '#2F6B4F';
  };

  const fetchShifts = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, "shifts"), orderBy("createdAt", "desc")));

      const shiftsArray = [];
      const transportArray = [];
      const mockMonth = currentDateState.toLocaleString('default', { month: 'short' }).toUpperCase() + ' ' + currentDateState.getFullYear();
      setCurrentMonth(mockMonth);

      snapshot.forEach(doc => {
        const data = doc.data();

        let clientName = data.clientName || data.clientDetails?.name || "Unknown Client";
        let staffName = data.name || data.staffName || data.user || "Staff Node";
        let dateObj = data.startDate?.toDate ? data.startDate.toDate() : new Date();
        let formattedDate = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        let category = data.shiftType || 'Regular Shift';

        const shiftData = {
          id: doc.id,
          clientName: clientName,
          clientId: data.clientId || data.clientDetails?.id || "N/A",
          clientAvatar: clientName.substring(0, 2).toUpperCase(),
          staffName: staffName,
          staffId: "N/A",
          staffAvatar: staffName.substring(0, 2).toUpperCase(),
          category: category,
          categoryId: category,
          categoryColor: getCategoryColor(category),
          shiftType: 'Regular',
          date: formattedDate,
          time: `${data.startTime || '00:00'} - ${data.endTime || '00:00'}`,
          status: getShiftStatus(data.clockIn, data.clockOut),
          confirmed: !!data.clockIn,
          locked: false,
          dayNum: dateObj.getDate().toString(),
          monthNum: dateObj.getMonth(),
          yearNum: dateObj.getFullYear()
        };

        shiftsArray.push(shiftData);

        // Map to transports if they contain transportation specifics
        if (data.transportation || category.includes('Transport')) {
          let primaryPoint = Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0 ? data.shiftPoints[0] : {};

          let pUpAddress = primaryPoint.pickupLocation || data.pickupLocation || 'N/A';
          let pUpTime = primaryPoint.pickupTime || data.pickupTime || 'N/A';
          let dropAddress = primaryPoint.dropLocation || data.dropLocation || 'N/A';
          let vAddress = primaryPoint.visitLocation || data.visitLocation || '';

          let p1 = data.transportation?.pickupDone;
          let p2 = data.transportation?.visitDone;
          let p3 = data.transportation?.dropDone;

          transportArray.push({
            id: doc.id,
            pickUpAddress: pUpAddress,
            pickUpTime: pUpTime,
            visitAddress: vAddress || 'N/A',
            arrivedTime: data.transportation?.visitTime || '--',
            dropOffAddress: dropAddress,
            dropOffTime: data.transportation?.dropTime || '--',
            clientName: clientName,
            clientId: shiftData.clientId,
            seatType: 'Standard Seat',
            transportType: 'Agency Transport',
            status: getShiftStatus(data.clockIn, data.clockOut),
            progress: [p1, p2, p3],
            // Filler data because UI expects it
            transportationRate: '5.50',
            startingPoint: pUpAddress,
            destinations: vAddress ? [{ label: 'Visit Location', address: vAddress }] : [],
            endingPoint: dropAddress,
            distance: 15.0,
            ratePerKm: 5.50,
            totalCost: 82.50
          });
        }
      });

      setAllShifts(shiftsArray);
      setTransports(transportArray);

      // Generate Calendar arrays dynamically from the DB results
      generateCalendarData(shiftsArray);
    } catch (e) {
      console.error("Error fetching shifts", e);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch and re-generate when month changes
  useEffect(() => {
    fetchShifts();
  }, [currentDateState]);

  const generateCalendarData = (sArr) => {
    const targetMonth = currentDateState.getMonth();
    const targetYear = currentDateState.getFullYear();

    // Filter shifts that specifically belong to the currently viewed month
    const validMonthShifts = sArr.filter(s => s.monthNum === targetMonth && s.yearNum === targetYear);

    // Week strip
    let weekArr = [];
    // Calculate the start of the week containing currentDateState
    const startOfWeek = new Date(currentDateState);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      let d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      let dayStr = d.toLocaleDateString("en-US", { weekday: 'short' }).toUpperCase();
      let dateNum = d.getDate().toString();
      let isCorrectMonth = d.getMonth() === targetMonth;

      // Only count shifts if that day in the week row actually falls in the target month (overlap)
      let dayShifts = isCorrectMonth ? validMonthShifts.filter(s => s.dayNum === dateNum) : [];
      weekArr.push({
        day: dayStr,
        date: dateNum,
        totalShifts: dayShifts.length,
        shiftTypes: dayShifts.map(s => ({ type: s.category, color: s.categoryColor })),
        isCorrectMonth: isCorrectMonth
      });
    }
    setCalendarDays(weekArr);

    // Month Grid - Find how many days in the month
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    let monthArr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      let iStr = i.toString();
      let dayShifts = validMonthShifts.filter(s => s.dayNum === iStr);
      monthArr.push({
        date: i,
        shifts: dayShifts.length,
        shiftColors: dayShifts.map(s => s.categoryColor)
      });
    }
    setMonthDays(monthArr);
  };

  const changeMonth = (offset) => {
    setCurrentDateState(prev => {
      const newD = new Date(prev);
      newD.setMonth(newD.getMonth() + offset);
      // Reset to day 1 so selectedDay logically matches up with month start just in case it's shorter
      setSelectedDay("1");
      return newD;
    });
  };

  const filteredShifts = selectedCategory === 'all'
    ? allShifts.filter(s => s.dayNum === selectedDay && s.monthNum === currentDateState.getMonth() && s.yearNum === currentDateState.getFullYear())
    : allShifts.filter(shift => shift.category === selectedCategory && shift.dayNum === selectedDay && shift.monthNum === currentDateState.getMonth() && shift.yearNum === currentDateState.getFullYear());

  const handleViewMore = (transport) => {
    setSelectedTransport(transport);
    setShowDetailsSheet(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{activeTab === 'shifts' ? 'Shift Scheduling' : 'Transportation Tracking'}</Text>
          <Text style={s.headerSubTitle}>
            {activeTab === 'shifts' ? `Total Shifts: ${filteredShifts.length}` : `Showing Results: ${transports.length}`}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/admin/add-shift')} style={s.addBtn}>
          <Feather name="plus" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Main Scroll Content */}
      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>

        {/* Sticky Tabs Section */}
        <View style={s.stickyTabsWrapper}>
          <View style={s.tabSwitcher}>
            <Pressable
              style={[s.tabButton, activeTab === 'shifts' ? s.tabActive : s.tabInactive]}
              onPress={() => setActiveTab('shifts')}
            >
              <Text style={activeTab === 'shifts' ? s.tabActiveText : s.tabInactiveText}>Shifts</Text>
            </Pressable>
            <Pressable
              style={[s.tabButton, activeTab === 'transportations' ? s.tabActive : s.tabInactive]}
              onPress={() => setActiveTab('transportations')}
            >
              <Text style={activeTab === 'transportations' ? s.tabActiveText : s.tabInactiveText}>Transportations</Text>
            </Pressable>
          </View>

          {/* Filter Chips - Only for Shifts */}
          {activeTab === 'shifts' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[s.filterChip, selectedCategory === cat.id ? s.filterChipActive : s.filterChipInactive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={selectedCategory === cat.id ? s.filterChipActiveText : s.filterChipInactiveText}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Content Region */}
        {activeTab === 'shifts' ? (
          <View style={s.contentPad}>

            {/* Calendar Controls */}
            <View style={s.calControls}>
              <Pressable style={s.iconBtn} onPress={() => changeMonth(-1)}>
                <Feather name="chevron-left" size={20} color="#666" />
              </Pressable>
              <Text style={s.calMonth}>{currentMonth}</Text>
              <Pressable style={s.iconBtn} onPress={() => changeMonth(1)}>
                <Feather name="chevron-right" size={20} color="#666" />
              </Pressable>
            </View>

            {/* View Toggles */}
            <View style={s.viewToggles}>
              <Pressable
                style={[s.viewToggleBtn, calendarView === 'week' ? s.viewToggleActive : s.viewToggleInactive]}
                onPress={() => setCalendarView('week')}
              >
                <Text style={calendarView === 'week' ? s.viewToggleActiveText : s.viewToggleInactiveText}>Week</Text>
              </Pressable>
              <Pressable
                style={[s.viewToggleBtn, calendarView === 'month' ? s.viewToggleActive : s.viewToggleInactive]}
                onPress={() => setCalendarView('month')}
              >
                <Text style={calendarView === 'month' ? s.viewToggleActiveText : s.viewToggleInactiveText}>Month</Text>
              </Pressable>
            </View>

            {/* Calendar Render */}
            {calendarView === 'week' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.weekScroll}>
                {calendarDays.map((day) => (
                  <WeeklyDatePill
                    key={day.date}
                    dayInfo={day}
                    isSelected={selectedDay === day.date}
                    onSelect={() => setSelectedDay(day.date)}
                  />
                ))}
              </ScrollView>
            )}

            {calendarView === 'month' && (
              <View style={s.monthGridBox}>
                <View style={[s.row, { marginBottom: 12 }]}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <Text key={d} style={s.monthDayLabel}>{d}</Text>
                  ))}
                </View>
                <View style={s.monthGrid}>
                  {monthDays.map(d => (
                    <MonthGridCell
                      key={d.date}
                      dayData={d}
                      isSelected={selectedDay === d.date.toString()}
                      onSelect={() => setSelectedDay(d.date.toString())}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Upcoming Shifts List */}
            <View style={{ marginTop: 24, marginBottom: 12 }}>
              <Text style={s.sectionHead}>Upcoming Shifts</Text>
              <Text style={s.sectionSub}>{filteredShifts.length} shifts scheduled</Text>
            </View>

            <View style={{ gap: 12, paddingBottom: 40 }}>
              {filteredShifts.map((shift) => (
                <MinimalShiftCard key={shift.id} shift={shift} router={router} />
              ))}
            </View>

          </View>
        ) : (
          <View style={s.contentPad}>
            {/* Transportations Content */}
            <View style={{ marginBottom: 12, marginTop: 8 }}>
              <Text style={s.sectionHead}>Transportation Tracking</Text>
              <Text style={s.sectionSub}>Recent Transportations</Text>
            </View>

            <View style={{ gap: 12, paddingBottom: 40 }}>
              {transports.map((transport) => (
                <TransportCard key={transport.id} transport={transport} onViewMore={handleViewMore} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Transportation Details Sheet Modal */}
      <Modal visible={showDetailsSheet} transparent animationType="slide" onRequestClose={() => setShowDetailsSheet(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowDetailsSheet(false)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Transportation Details</Text>
              <Pressable onPress={() => setShowDetailsSheet(false)} style={{ padding: 8 }}><Feather name="x" size={24} color="#333" /></Pressable>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {selectedTransport && (
                <View style={{ gap: 12, paddingBottom: 40 }}>

                  {/* Rate Card */}
                  <View style={s.detailCard}>
                    <Text style={s.tinyLabel}>Transportation Rate</Text>
                    <Text style={s.boldValue}>{selectedTransport.transportationRate}¢ per Kilometer</Text>
                  </View>

                  {/* Route Steps */}
                  <View style={s.routeCard}>
                    <Text style={s.tinyLabel}>Client</Text>
                    <Text style={s.boldValueSmall}>{selectedTransport.clientName}</Text>

                    <View style={{ height: 16 }} />
                    <Text style={s.tinyLabel}>Starting Point</Text>
                    <Text style={s.boldValueSmall}>{selectedTransport.startingPoint}</Text>

                    <View style={s.divider} />

                    {selectedTransport.destinations.map((dest, i) => (
                      <View key={i}>
                        <Text style={s.tinyLabel}>{dest.label}</Text>
                        <Text style={s.boldValueSmall}>{dest.address}</Text>
                      </View>
                    ))}

                    <View style={s.divider} />

                    <Text style={s.tinyLabel}>Ending Point</Text>
                    <Text style={s.boldValueSmall}>{selectedTransport.endingPoint}</Text>
                  </View>

                  {/* Summary Cost */}
                  <View style={s.detailCard}>
                    <View style={s.rowBetween}><Text style={s.tinyLabel}>Distance:</Text><Text style={s.boldValueSmall}>{selectedTransport.distance} Km</Text></View>
                    <View style={s.rowBetween}><Text style={s.tinyLabel}>Rate per Km:</Text><Text style={s.boldValueSmall}>${selectedTransport.ratePerKm.toFixed(2)}</Text></View>
                    <View style={s.divider} />
                    <View style={s.rowBetween}><Text style={s.tinyLabel}>Total Cost</Text><Text style={[s.boldValue, { color: '#39A75E' }]}>${selectedTransport.totalCost.toFixed(2)}</Text></View>
                  </View>

                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

/* ========================================= */
/*               SUB-COMPONENTS              */
/* ========================================= */

function WeeklyDatePill({ dayInfo, isSelected, onSelect }) {
  const dots = dayInfo.shiftTypes.slice(0, 3);
  const extra = dayInfo.totalShifts > 3 ? dayInfo.totalShifts - 3 : 0;
  // If the week spills over to previous/next month, fade out text
  const opacityStyle = dayInfo.isCorrectMonth ? {} : { opacity: 0.3 };

  return (
    <Pressable style={[s.pill, isSelected ? s.pillActive : s.pillInactive, opacityStyle]} onPress={onSelect}>
      <Text style={[s.pillDayText, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>{dayInfo.day}</Text>
      <Text style={[s.pillDateText, isSelected && { color: '#fff' }]}>{dayInfo.date}</Text>

      {dayInfo.totalShifts > 0 ? (
        <View style={s.pillDotsWrap}>
          {dots.map((sT, i) => <View key={i} style={[s.dot, { backgroundColor: isSelected ? '#fff' : sT.color }]} />)}
          {extra > 0 && <Text style={[s.pillExtraText, isSelected && { color: '#fff' }]}>+{extra}</Text>}
        </View>
      ) : <View style={{ height: 6 }} />}
    </Pressable>
  );
}

function MonthGridCell({ dayData, isSelected, onSelect }) {
  const isEmpty = dayData.shifts === 0;
  return (
    <Pressable style={[s.gridCell, isSelected ? s.gridCellActive : (isEmpty ? null : s.gridCellHasData)]} onPress={onSelect}>
      <Text style={[s.gridCellText, isSelected && { color: '#fff' }, isEmpty && { color: '#CCC' }]}>{dayData.date}</Text>
      {!isEmpty && (
        <View style={s.pillDotsWrap}>
          {dayData.shiftColors.slice(0, 2).map((c, i) => <View key={i} style={[s.dot, { backgroundColor: isSelected ? '#fff' : c }]} />)}
        </View>
      )}
    </Pressable>
  );
}

// Convert Hex to rgba for nice tag backgrounds
const hexToRgba = (hex, alpha) => {
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function MinimalShiftCard({ shift, router }) {
  const [locked, setLocked] = useState(shift.locked);

  return (
    <View style={s.shiftCard}>
      {/* Header Avatars */}
      <View style={[s.row, { marginBottom: 16, alignItems: 'center' }]}>
        <View style={s.avatarCombo}>
          <View style={[s.avatarSmall, { backgroundColor: '#4ECDC4' }]}><Text style={s.avaText}>{shift.clientAvatar}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.nameText}>{shift.clientName?.replace(' ', '\n')}</Text>
            <Text style={s.subText}>ID: {shift.clientId}</Text>
          </View>
        </View>
        <Feather name="arrow-right" size={16} color="#D0D0D0" />
        <View style={[s.avatarCombo, { justifyContent: 'flex-end', paddingLeft: 8 }]}>
          <View style={[s.avatarSmall, { backgroundColor: '#9D4EDD' }]}><Text style={s.avaText}>{shift.staffAvatar}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.nameText}>{shift.staffName?.replace(' ', '\n')}</Text>
            <Text style={s.subText}>ECM: {shift.staffId}</Text>
          </View>
        </View>
      </View>

      <View style={s.divider} />

      {/* Tag */}
      <View style={[s.tag, { backgroundColor: hexToRgba(shift.categoryColor, 0.1) }]}>
        <Text style={[s.tagText, { color: shift.categoryColor }]}>{shift.category}</Text>
      </View>

      {/* Triple Data */}
      <View style={{ gap: 12, marginBottom: 16 }}>
        <View>
          <Text style={s.tinyLabel}>SHIFT TYPE</Text>
          <Text style={s.boldValueSmall}>{shift.shiftType}</Text>
        </View>
        <View>
          <Text style={s.tinyLabel}>DATE & TIME</Text>
          <Text style={s.boldValueSmall}>{shift.date}, {shift.time}</Text>
        </View>
        <View>
          <Text style={s.tinyLabel}>STATUS</Text>
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: '#2F6B4F', marginRight: 6 }]} />
            <Text style={[s.boldValueSmall, { color: '#2F6B4F' }]}>{shift.status} • {shift.confirmed ? 'Confirmed' : 'Pending'}</Text>
          </View>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.rowBetween}>
        <View style={s.row}>
          <Feather name="lock" size={14} color="#7A7A7A" style={{ marginRight: 6 }} />
          <Text style={s.boldValueSmall}>Shift Lock</Text>
        </View>
        <Switch value={locked} onValueChange={setLocked} trackColor={{ false: "#E5E7EB", true: "#2D5F3F" }} />
      </View>

      <View style={[s.row, { marginTop: 16, gap: 12 }]}>
        <Pressable
          style={s.viewReportBtn}
          onPress={() => router.push(`/admin/shift-report/${shift.id}/report`)}
        >
          <Text style={s.viewReportText}>View Report</Text>
        </Pressable>
        <Pressable style={s.iconSquareBtn}><Feather name="download" size={20} color="#666" /></Pressable>
        <Pressable
          style={s.iconSquareBtn}
          onPress={() => router.push(`/admin/edit-shift?id=${shift.id}`)}
        ><Feather name="edit-2" size={20} color="#666" /></Pressable>
      </View>
    </View>
  );
}

function TransportCard({ transport, onViewMore }) {
  const isCmp = transport.status === 'Completed';
  const isProg = transport.status === 'In Progress';
  const statusColor = isCmp ? '#10B981' : (isProg ? '#F59E0B' : '#9CA3AF');

  return (
    <View style={s.shiftCard}>
      <View style={[s.rowBetween, { marginBottom: 20 }]}>
        <View style={[s.capsuleTag, { backgroundColor: statusColor }]}>
          {isCmp && <Feather name="check" size={12} color="#fff" style={{ marginRight: 4 }} />}
          <Text style={s.capsuleTagText}>{transport.status}</Text>
        </View>
        <View style={s.grayPill}><Text style={s.grayPillText}>{transport.pickUpTime}</Text></View>
      </View>

      {/* Timeline Steps (Vertical Lines) */}
      <View style={s.timeline}>

        {/* Step 1 */}
        <View style={s.tlRow}>
          <View style={s.tlIconWrap}>
            <View style={[s.tlCircle, { backgroundColor: transport.progress[0] ? '#10B981' : '#E5E7EB' }]}>
              {transport.progress[0] ? <Feather name="check" size={16} color="#fff" /> : <FontAwesome5 name="car" size={14} color="#9CA3AF" />}
            </View>
            <View style={[s.tlLine, { backgroundColor: transport.progress[1] ? '#10B981' : '#E5E7EB' }]} />
          </View>
          <View style={s.tlContent}>
            <View style={s.row}><Feather name="map-pin" size={14} color="#2D5F3F" style={s.tlIconBadge} /><Text style={s.tlTitle}>Pick Up</Text></View>
            <Text style={s.tlSubtitle}>{transport.pickUpAddress}</Text>
            <Text style={s.tlTiny}>{transport.pickUpTime}</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={s.tlRow}>
          <View style={s.tlIconWrap}>
            <View style={[s.tlCircle, { backgroundColor: transport.progress[1] ? '#F59E0B' : '#E5E7EB' }]}>
              {transport.progress[1] ? <Feather name="check" size={16} color="#fff" /> : <Feather name="map-pin" size={16} color="#9CA3AF" />}
            </View>
            <View style={[s.tlLine, { backgroundColor: transport.progress[2] ? '#EF4444' : '#E5E7EB' }]} />
          </View>
          <View style={[s.tlContent, { paddingTop: 4 }]}>
            <View style={s.row}><Feather name="map-pin" size={14} color="#F59E0B" style={[s.tlIconBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]} /><Text style={s.tlTitle}>Visit</Text></View>
            <Text style={s.tlSubtitle}>{transport.visitAddress}</Text>
            <Text style={s.tlTiny}>Arrived: {transport.arrivedTime}</Text>
          </View>
        </View>

        {/* Step 3 */}
        <View style={[s.tlRow, { minHeight: 0 }]}>
          <View style={[s.tlIconWrap, { minHeight: 0 }]}>
            <View style={[s.tlCircle, { backgroundColor: transport.progress[2] ? '#EF4444' : '#E5E7EB' }]}>
              {transport.progress[2] ? <Feather name="check" size={16} color="#fff" /> : <Feather name="map-pin" size={16} color="#9CA3AF" />}
            </View>
          </View>
          <View style={[s.tlContent, { paddingTop: 4 }]}>
            <View style={s.row}><Feather name="map-pin" size={14} color="#EF4444" style={[s.tlIconBadge, { backgroundColor: 'rgba(239,68,68,0.1)' }]} /><Text style={s.tlTitle}>Drop Off</Text></View>
            <Text style={s.tlSubtitle}>{transport.dropOffAddress}</Text>
            <Text style={s.tlTiny}>Dropped: {transport.dropOffTime}</Text>
          </View>
        </View>
      </View>

      <View style={s.graySummaryBox}>
        <View style={s.rowBetween}><Text style={s.tinyLabel}>Client:</Text><Text style={s.boldValueSmall}>{transport.clientName}</Text></View>
        <View style={s.divider} />
        <View style={s.rowBetween}><Text style={s.tinyLabel}>Seat Type:</Text><Text style={s.boldValueSmall}>{transport.seatType}</Text></View>
        <View style={s.divider} />
        <View style={s.rowBetween}><Text style={s.tinyLabel}>Type:</Text><Text style={s.boldValueSmall}>{transport.transportType}</Text></View>
      </View>

      <View style={[s.row, { gap: 12 }]}>
        <Pressable style={s.outlineMapBtn}><Text style={s.outlineMapBtnText}>View in Maps</Text></Pressable>
        <Pressable style={s.fillViewBtn} onPress={() => onViewMore(transport)}><Text style={s.fillViewBtnText}>View More</Text></Pressable>
      </View>
    </View>
  );
}

/* ========================================= */
/*                   STYLES                  */
/* ========================================= */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  headerSubTitle: { fontSize: 13, color: '#666', marginTop: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D5F3F', justifyContent: 'center', alignItems: 'center', elevation: 4 },

  stickyTabsWrapper: { backgroundColor: '#F9F7F4', zIndex: 10, paddingBottom: 16 },
  tabSwitcher: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  tabActive: { backgroundColor: '#2D5F3F', borderColor: '#2D5F3F' },
  tabInactive: { backgroundColor: '#fff', borderColor: '#E5E7EB' },
  tabActiveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tabInactiveText: { color: '#666', fontSize: 14, fontWeight: '600' },

  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  filterChipActive: { backgroundColor: '#2D5F3F', borderColor: '#2D5F3F' },
  filterChipInactive: { backgroundColor: '#fff', borderColor: '#E5E7EB' },
  filterChipActiveText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  filterChipInactiveText: { color: '#666', fontWeight: '600', fontSize: 13 },

  contentPad: { paddingHorizontal: 20 },

  calControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBtn: { padding: 4, borderRadius: 8 },
  calMonth: { fontSize: 18, fontWeight: '600', color: '#333' },

  viewToggles: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  viewToggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  viewToggleActive: { backgroundColor: '#2F6B4F', borderColor: '#2F6B4F' },
  viewToggleInactive: { backgroundColor: '#fff', borderColor: '#E5E7EB' },
  viewToggleActiveText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  viewToggleInactiveText: { color: '#999', fontWeight: '600', fontSize: 13 },

  weekScroll: { gap: 12 },
  pill: { width: 68, borderRadius: 20, padding: 12, alignItems: 'center', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  pillActive: { backgroundColor: '#2F6B4F' },
  pillInactive: { backgroundColor: '#fff' },
  pillDayText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  pillDateText: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  pillDotsWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillExtraText: { fontSize: 9, fontWeight: '700', color: '#666' },

  monthGridBox: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2 },
  monthDayLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: '#999', fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  gridCellText: { fontSize: 14, fontWeight: '600', color: '#333' },
  gridCellActive: { backgroundColor: '#2F6B4F' },
  gridCellHasData: { backgroundColor: '#fff' },

  sectionHead: { fontSize: 18, fontWeight: '700', color: '#333' },
  sectionSub: { fontSize: 12, color: '#999', marginTop: 4 },

  shiftCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { height: 4, width: 0 } },
  avatarCombo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  nameText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2, lineHeight: 18 },
  subText: { fontSize: 11, color: '#7A7A7A' },

  divider: { height: 1, backgroundColor: '#ECE8E3', marginVertical: 12 },

  tag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16 },
  tagText: { fontSize: 13, fontWeight: '600' },

  tinyLabel: { fontSize: 11, color: '#9A9A9A', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  boldValueSmall: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  boldValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },

  viewReportBtn: { flex: 1, height: 48, borderRadius: 16, backgroundColor: '#2F6B4F', justifyContent: 'center', alignItems: 'center' },
  viewReportText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  iconSquareBtn: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#E5E1DC', justifyContent: 'center', alignItems: 'center' },

  capsuleTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  capsuleTagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  grayPill: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  grayPillText: { fontSize: 12, color: '#666', fontWeight: '600' },

  timeline: { paddingLeft: 8, marginBottom: 16 },
  tlRow: { flexDirection: 'row', minHeight: 80 },
  tlIconWrap: { width: 32, alignItems: 'center', minHeight: 80 },
  tlCircle: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  tlLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  tlContent: { flex: 1, paddingLeft: 16, paddingBottom: 24 },
  tlIconBadge: { padding: 4, backgroundColor: 'rgba(45,95,63,0.1)', borderRadius: 6, marginRight: 8 },
  tlTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  tlSubtitle: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 6, marginBottom: 2 },
  tlTiny: { fontSize: 11, color: '#999', fontWeight: '500' },

  graySummaryBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  outlineMapBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  outlineMapBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  fillViewBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#2D5F3F', justifyContent: 'center', alignItems: 'center' },
  fillViewBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.9 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  modalBody: { padding: 20 },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 },
  routeCard: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }
});
