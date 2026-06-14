import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Service date picker. mode="single" picks one date; mode="multi" lets the
 * admin toggle several dates. Calls onChange(datesArray) with JS Dates.
 */
export default function ServiceDateCalendar({ visible, onClose, mode = 'multi', selectedDates = [], onChange, title = 'Select Service Date' }) {
  const [month, setMonth] = useState(() => selectedDates[0] || new Date());

  const selectedKeys = new Set(selectedDates.map(keyOf));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const today = new Date();

  const toggleDay = (day) => {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    if (mode === 'single') { onChange([d]); return; }
    const k = keyOf(d);
    if (selectedKeys.has(k)) onChange(selectedDates.filter((x) => keyOf(x) !== k));
    else onChange([...selectedDates, d]);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<View key={`e${i}`} style={st.cell} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    const isSel = selectedKeys.has(keyOf(d));
    const isToday = today.getDate() === day && today.getMonth() === month.getMonth() && today.getFullYear() === month.getFullYear();
    cells.push(
      <Pressable key={day} style={st.cell} onPress={() => toggleDay(day)}>
        <View style={[st.day, isSel && st.daySel, !isSel && isToday && st.dayToday]}>
          <Text style={[st.dayText, isSel && st.dayTextSel]}>{day}</Text>
        </View>
      </Pressable>
    );
  }
  while (cells.length % 7 !== 0) cells.push(<View key={`f${cells.length}`} style={st.cell} />);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} />
      <View style={st.sheetWrap}>
        <View style={st.sheet}>
          <View style={st.header}>
            <Text style={st.title}>{title}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color="#666" /></Pressable>
          </View>

          <View style={st.nav}>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} style={st.navBtn}><Ionicons name="chevron-back" size={20} color="#666" /></Pressable>
            <Text style={st.monthText}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} style={st.navBtn}><Ionicons name="chevron-forward" size={20} color="#666" /></Pressable>
          </View>

          <View style={st.weekRow}>
            {DAYS.map((d) => <View key={d} style={st.cell}><Text style={st.weekText}>{d}</Text></View>)}
          </View>
          <View style={st.grid}>{cells}</View>

          {mode === 'multi' && (
            <Text style={st.hint}>{selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected · tap to toggle</Text>
          )}

          <View style={st.footer}>
            <Pressable style={st.doneBtn} onPress={onClose}>
              <Text style={st.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const GREEN = '#2D5F3F';
const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 17, fontWeight: '700', color: '#333' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  navBtn: { padding: 6 },
  monthText: { fontSize: 16, fontWeight: '700', color: '#333' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  day: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: GREEN },
  dayToday: { borderWidth: 1.5, borderColor: GREEN },
  dayText: { fontSize: 14, color: '#333', fontWeight: '500' },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  hint: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 14 },
  doneBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
