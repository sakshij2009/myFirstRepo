import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ApplyLeaveModal({ visible, onClose, onSubmit }) {
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [showLeaveTypes, setShowLeaveTypes] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const leaveTypes = ["Casual"];

  const handleSubmit = () => {
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      alert("Please fill all fields");
      return;
    }

    onSubmit({
      leaveType,
      reason,
      startDate,
      endDate,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center", // 👈 unchanged
            }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  margin: 20,
                  padding: 20,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "700" }}>
                  Apply Leave
                </Text>

                {/* ===== LEAVE TYPE DROPDOWN ===== */}
                <Text style={{ marginTop: 12, fontWeight: "600" }}>
                  Leave Type
                </Text>

                <Pressable
                  onPress={() => setShowLeaveTypes(!showLeaveTypes)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 6,
                    backgroundColor: "#F9FAFB",
                  }}
                >
                  <Text style={{ color: leaveType ? "#111827" : "#6B7280" }}>
                    {leaveType || "Select Leave Type"}
                  </Text>
                </Pressable>

                {showLeaveTypes &&
                  leaveTypes.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setLeaveType(type);
                        setShowLeaveTypes(false);
                      }}
                      style={{
                        padding: 10,
                        marginTop: 6,
                        borderRadius: 6,
                        backgroundColor:
                          leaveType === type ? "#DCFCE7" : "#F3F4F6",
                      }}
                    >
                      <Text>{type}</Text>
                    </Pressable>
                  ))}

                {/* ===== START DATE ===== */}
                <Text style={{ marginTop: 12, fontWeight: "600" }}>
                  Start Date
                </Text>

                <Pressable
                  onPress={() => setShowStartPicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                >
                  <Text>
                    {startDate
                      ? startDate.toLocaleDateString()
                      : "Select Start Date"}
                  </Text>
                </Pressable>

                {showStartPicker && (
                  <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(e, date) => {
                      setShowStartPicker(false);
                      if (date) setStartDate(date);
                    }}
                  />
                )}

                {/* ===== END DATE ===== */}
                <Text style={{ marginTop: 12, fontWeight: "600" }}>
                  End Date
                </Text>

                <Pressable
                  onPress={() => setShowEndPicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                >
                  <Text>
                    {endDate
                      ? endDate.toLocaleDateString()
                      : "Select End Date"}
                  </Text>
                </Pressable>

                {showEndPicker && (
                  <DateTimePicker
                    value={endDate || startDate || new Date()}
                    mode="date"
                    minimumDate={startDate || undefined}
                    display="default"
                    onChange={(e, date) => {
                      setShowEndPicker(false);
                      if (date) setEndDate(date);
                    }}
                  />
                )}

                {/* ===== REASON ===== */}
                <TextInput
                  placeholder="Reason for leave"
                  placeholderTextColor="#6B7280"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 6,
                    minHeight: 80,
                    textAlignVertical: "top", // 👈 Android fix
                  }}
                />

                {/* ===== ACTIONS ===== */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 16,
                  }}
                >
                  <Pressable onPress={onClose}>
                    <Text style={{ marginRight: 20 }}>Cancel</Text>
                  </Pressable>

                  <Pressable onPress={handleSubmit}>
                    <Text
                      style={{
                        color: "#166534",
                        fontWeight: "700",
                      }}
                    >
                      Submit
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
