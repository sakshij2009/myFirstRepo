import { Modal, View, Text, Pressable } from "react-native";

export default function EmergencyCallModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 10,
            width: 260,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontWeight: "700" }}>
              On Calls (Emergency)
            </Text>
            <Pressable onPress={onClose}>
              <Text>X</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text>Family Forever</Text>
            <Text style={{ color: "#166534" }}>
              +1 416-555-0199
            </Text>
            <Text style={{ color: "#166534" }}>
              +1 416-555-0199
            </Text>

            <Text style={{ marginTop: 10 }}>Agency</Text>
            <Text style={{ color: "#166534" }}>
              +1 416-555-0199
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
