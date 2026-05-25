import { Modal, View, Pressable, Text, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";

export default function CalendarModal({ visible, onClose, onSelect }) {
  const [date, setDate] = useState(new Date());

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            width: "90%",
          }}
        >
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            preferredDatePickerStyle="wheels"
            themeVariant="light"
            onChange={(_, selected) => {
              if (selected) {
                setDate(selected);
                onSelect(selected);
              }
            }}
            style={{ height: 260 }}
          />

          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ textAlign: "center" }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
