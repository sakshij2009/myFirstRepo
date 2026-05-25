import { useRouter } from "expo-router";
import { View, Text, Image, Pressable } from "react-native";

export default function ShiftCard({ shift, onConfirm, onTransfer }) {
  const category =
    shift?.categoryName || shift?.shiftCategory || "General";

  const getCategoryStyle = () => {
    switch (category) {
      case "Emergent Care":
        return { bg: "#FFF1F2", border: "#FFCCD3", text: "#C70036" };
      case "Supervised Visitation":
        return { bg: "#FFFBEB", border: "#FEE685", text: "#BF4D00" };
      case "Respite Care":
        return { bg: "#ECFEFF", border: "#A2F4FD", text: "#007595" };
      default:
        return { bg: "#EEF2FF", border: "#C7D2FE", text: "#1D4ED8" };
    }
  };

  const colors = getCategoryStyle();
  const isThreeButtons = shift?.shiftConfirmed;
const router = useRouter();

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      {/* ===== CLIENT HEADER ===== */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image
          source={{
            uri:
              shift?.image ||
              "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
          }}
          style={{ width: 55, height: 55, borderRadius: 50 }}
        />

        <View style={{ flex: 1 }}>
            
          <Text style={{ fontWeight: "700", fontSize: 15 }}>
            {shift?.clientName || shift?.clientDetails?.name || "Client"}
          </Text>

          <Text style={{ color: "#6b7280", marginTop: 2 }}>
            Client ID:{" "}
            <Text style={{ fontWeight: "600" }}>
              {shift?.clientId || shift?.clientDetails?.id || "N/A"}
            </Text>
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: "#e5e7eb",
          marginVertical: 10,
        }}
      />

      {/* ===== TWO COLUMN LAYOUT (LIKE WEB DESIGN) ===== */}
      <View style={{ flexDirection: "row", gap: 20 }}>
        {/* LEFT COLUMN */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#6b7280" }}>Date</Text>
          <Text style={{ fontWeight: "600" }}>
            {shift?.startDate || "--"}
          </Text>

          <Text style={{ color: "#6b7280", marginTop: 12 }}>
            Shift Category
          </Text>

          <Text
            style={{
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              paddingVertical: 4,
              paddingHorizontal: 12,
              fontWeight: "700",
              borderRadius: 8,
            }}
            numberOfLines={1}
          >
            {category}
          </Text>
        </View>

        {/* RIGHT COLUMN */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#6b7280" }}>Shift Timeline</Text>
          <Text style={{ fontWeight: "600" }}>
            {(shift?.startTime || "--")} - {(shift?.endTime || "--")}
          </Text>

          <Text style={{ color: "#6b7280", marginTop: 12 }}>Agency</Text>
          <Text style={{ fontWeight: "600" }} numberOfLines={1}>
            {shift?.agencyName ||
              shift?.clientDetails?.agencyName ||
              "N/A"}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: "#e5e7eb",
          marginVertical: 12,
        }}
      />

     


{/* ===== BUTTONS ===== */}
<View
  style={{
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  }}
>
  {/* IF NOT CONFIRMED → SHOW CONFIRM BUTTON */}
  {!shift?.shiftConfirmed && (
    <Pressable
      style={{
        backgroundColor: "#1f5f3b",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
      }}
      onPress={() => onConfirm?.(shift)}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>
        Confirm Shift
      </Text>
    </Pressable>
  )}

  {/* IF CONFIRMED → SHOW MAKE REPORT BUTTON */}
  {shift?.shiftConfirmed && (
  <Pressable
    style={{
      borderWidth: 1,
      borderColor: "#2563eb",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    }}
    onPress={() =>
      router.push({
        pathname: "/report",
        params: {
          shiftId: shift?.shiftID || shift?.id
        }
      })
    }
  >
    <Text style={{ color: "#2563eb", fontWeight: "700" }}>
      Make Report
    </Text>
  </Pressable>
)}


  {/* TRANSFER ALWAYS SHOWS */}
  <Pressable
    style={{
      borderWidth: 1,
      borderColor: "#F97316",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    }}
    onPress={() => {
      //  console.log("Transfer clicked", shift?.id);
      onTransfer?.(shift)}}
  >
    <Text style={{ color: "#F97316", fontWeight: "700" }}>
      Transfer Shift
    </Text>
  </Pressable>
</View>



    </View>
  );
}
