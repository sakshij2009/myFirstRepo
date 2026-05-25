import { Modal, View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../src/firebase/config";

export default function TransferShiftModal({ visible, onClose, onSubmit }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [reason, setReason] = useState("");
  const [showStaffList, setShowStaffList] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      const snap = await getDocs(collection(db, "users"));
      setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    if (visible) fetchStaff();
  }, [visible]);

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    setShowStaffList(false); // 👈 close dropdown
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center" }}>
        <View style={{ backgroundColor: "#fff", margin: 20, padding: 20, borderRadius: 12 }}>

          <Text style={{ fontSize: 18, fontWeight: "700" }}>Transfer Shift</Text>

          {/* ===== DROPDOWN FIELD ===== */}
          <Text style={{ marginTop: 12, fontWeight: "600" }}>
            Transfer to staff member
          </Text>

          <Pressable
            onPress={() => setShowStaffList(!showStaffList)}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              padding: 12,
              borderRadius: 8,
              marginTop: 6,
              backgroundColor: "#F9FAFB",
            }}
          >
            <Text style={{ color: selectedStaff ? "#111827" : "#6B7280" }}>
              {selectedStaff
                ? selectedStaff.name || selectedStaff.email
                : "Select staff member"}
            </Text>
          </Pressable>

          {/* ===== STAFF LIST ===== */}
          {showStaffList && (
            <ScrollView style={{ maxHeight: 220, marginTop: 8 }}>
              {staffList.map((staff) => (
                <Pressable
                  key={staff.id}
                  onPress={() => handleSelectStaff(staff)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 6,
                    backgroundColor:
                      selectedStaff?.id === staff.id ? "#DCFCE7" : "#F3F4F6",
                  }}
                >
                  <Text>
                    {staff.name || staff.email}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* ===== REASON ===== */}
          <TextInput
            placeholder="Reason for transfer"
            placeholderTextColor="#6B7280"
            value={reason}
            onChangeText={setReason}
            multiline
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              minHeight: 80,
            }}
          />

          {/* ===== ACTIONS ===== */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16 }}>
            <Pressable onPress={onClose}>
              <Text style={{ marginRight: 20 }}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => onSubmit(selectedStaff, reason)}
              disabled={!selectedStaff}
            >
              <Text
                style={{
                  color: selectedStaff ? "#166534" : "#9CA3AF",
                  fontWeight: "700",
                }}
              >
                Transfer
              </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}
