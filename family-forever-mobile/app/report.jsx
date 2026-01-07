import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import ReportTransportationTab from "./ReportTransportationTab";
import { db } from "../src/firebase/config";
import MedicationTab from "./MedicationTab";

/* ---------- SMALL REUSABLE CARD FOR MORE ACTIONS ---------- */
const ActionCard = ({
  title,
  description,
  btnText,
  bg,
  color,
  icon,
}) => (
  <View
    style={{
      backgroundColor: bg,
      borderRadius: 5,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: color + "55",
    }}
  >
    {/* HEADER */}
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          backgroundColor: color + "22",
          padding: 8,
          borderRadius: 8,
          marginRight: 10,
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>

      <Text style={{ fontWeight: "800", color, fontSize: 16 }}>
        {title}
      </Text>
    </View>

    <Text style={{ color, fontSize: 12, marginVertical: 6 }}>
      {description}
    </Text>

    {/* BUTTON */}
    <Pressable
      style={{
        backgroundColor: color,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 6,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={18}
        color="#fff"
      />
      <Text style={{ color: "#fff", fontWeight: "700" }}>
        {btnText}
      </Text>
    </Pressable>
  </View>
);



export default function Report() {
  const router = useRouter();
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [reportText, setReportText] = useState("");
  const [expandCategory, setExpandCategory] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
const [activeTab, setActiveTab] = useState("Report");


const formatTo12Hour = (isoString) => {
  if (!isoString) return "--";

  // Extract HH:mm from ISO string
  const timePart = isoString.split("T")[1]; // "16:00:00.000Z"
  const [hourStr, minuteStr] = timePart.split(":");

  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  const mins = minutes < 10 ? `0${minutes}` : minutes;

  return `${hours}:${mins} ${ampm}`;
};


const calculateTotalHours = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return "N/A";

  const getMinutes = (iso) => {
    const time = iso.split("T")[1];
    const [h, m] = time.split(":");
    return parseInt(h, 10) * 60 + parseInt(m, 10);
  };

  
 



  let start = getMinutes(clockIn);
  let end = getMinutes(clockOut);

  // Handle overnight shift
  if (end < start) end += 24 * 60;

  const diff = end - start;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  return `${hours}h ${minutes}m`;
};



 useEffect(() => {
    const loadShift = async () => {
      try {
        const ref = doc(db, "shifts", String(shiftId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setShift({ id: snap.id, ...data });

          // 🔥 auto-fill report if exists
          if (data.shiftReport) {
            setReportText(data.shiftReport);
          }
           if (data.reportSubmitted === true) {
            setIsSubmitted(true); // 🔒 restore lock
          }
        }
      } catch (e) {
        console.log("Error loading shift", e);
      }
    };
    loadShift();
  }, []);

   /* ---------- SAVE AS DRAFT ---------- */
  const saveDraft = async () => {
    if (!reportText.trim()) {
      alert("Draft is empty");
      return;
    }
    try {
      await updateDoc(doc(db, "shifts", String(shiftId)), {
        shiftReport: reportText,
      });
      alert("Draft saved");
    } catch (e) {
      console.log("Save draft error:", e);
      alert("Failed to save draft");
    }
  };

  /* ---------- SUBMIT REPORT ---------- */
  const submitReport = async () => {
    if (!reportText.trim()) {
      alert("Report cannot be empty");
      return;
    }
    try {
      await updateDoc(doc(db, "shifts", String(shiftId)), {
        shiftReport: reportText,
        reportSubmitted: true,
      });
      setIsSubmitted(true); // 🔒 lock editing
      alert("Report submitted");
    } catch (e) {
      alert("Failed to submit report");
    }
  };

  

  if (!shift) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F4F6" }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ---------- TOP ICON ROW ---------- */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            marginTop: 6,
          }}
        >
          <Image
            source={require("../assets/Logo2.png")}
            style={{ width: 44, height: 44 }}
          />

          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: "#1f5f3b",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={18}
              color="#fff"
            />
          </View>
        </View>

        {/* ---------- CENTER TITLE ---------- */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 18,
            fontWeight: "800",
            marginTop: 6,
          }}
        >
          Family Forever Inc.
        </Text>

        {/* ---------- BACK + REPORTS ---------- */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            marginTop: 14,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color="#000"
            />
          </Pressable>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              marginLeft: 6,
            }}
          >
            Reports
          </Text>
        </View>

        {/* ---------- CLIENT STATISTICS ---------- */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 17 }}>
            Client Statistics
          </Text>
          
        </View>

        {/* ---------- CLIENT CARD ---------- */}
        <View
          style={{
            backgroundColor: "#fff",
            marginHorizontal: 16,
            marginTop: 12,
            padding: 14,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Image
            source={{
              uri:
                shift?.clientImage ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            }}
            style={{ width: 54, height: 54, borderRadius: 27 }}
          />

          <View style={{ marginLeft: 10 ,gap:3}}>
            <Text style={{ fontWeight: "800" }}>
              {shift?.clientName || "Client"}
            </Text>
            <Text>Client ID: {shift?.clientId || "N/A"}</Text>
           <Pressable onPress={() => setExpandCategory(!expandCategory)}>
  <Text
    numberOfLines={expandCategory ? undefined : 1}
    ellipsizeMode="tail"
    style={{ maxWidth: 250 }}
  >
    Shift Category: {shift?.categoryName || "--"}
  </Text>
</Pressable>

            <Text>Date of Birth: {shift?.dob || "--"}</Text>
          </View>
        </View>

        {/* ---------- TABS ---------- */}
        {/* ---------- TABS ---------- */}
<View
  style={{
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  }}
>
  {["Report", "Medication", "Transport"].map((tab) => {
    const isActive = activeTab === tab;

    return (
      <Pressable
        key={tab}
        onPress={() => setActiveTab(tab)}
        style={{
          flex: 1,
          backgroundColor: isActive ? "#14532D" : "#fff",
          borderWidth: isActive ? 0 : 1,
          borderColor: "#D1D5DB",
          paddingVertical: 8,
          borderRadius: 5,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            color: isActive ? "#fff" : "#000",
          }}
        >
          {tab}
        </Text>
      </Pressable>
    );
  })}
</View>


       
       {/* ---------- META INFO (2 COLUMN) ---------- */}
{/* =====================================================
    TAB CONTENT (ONLY THIS CHANGES)
===================================================== */}

{/* ================= REPORT TAB ================= */}
{activeTab === "Report" && (
  <>
    {/* ---------- META INFO (2 COLUMN) ---------- */}
    <View
      style={{
        marginTop: 16,
        flexDirection: "row",
        marginLeft: 16,
        gap: 3,
      }}
    >
      <View style={{ gap: 3 }}>
        <Text>📅 Date - {shift?.startDate || "--"}</Text>
        <Text>🆔 Staff ID - {shift?.userId || "--"}</Text>
         <Text>👤 Staff Name - {shift?.name || "--"}</Text>
        <Text>👦 Client Name - {shift?.clientName || "--"}</Text>
        <Text >
            ⏱ Shift Time - {shift?.startTime || "--"} - {shift?.endTime || "--"}
          </Text>
      </View>

    </View>

  

    {/* Divider */}
    <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 }} />

    {/* ---------- SHIFT TIMELINE ---------- */}
    <View style={{ marginHorizontal: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "800" }}>Shift Timeline</Text>
        <Text>
          Total Hours{" "}
          <Text style={{ color: "#2563EB", fontWeight: "800" }}>
            {calculateTotalHours(shift?.clockIn, shift?.clockOut)}
          </Text>
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 5,
        }}
      >
        <View>
          <Text style={{ fontWeight: "700" }}>
            Clock In: {formatTo12Hour(shift?.clockIn)}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>
            {shift?.clockInLocation || "Location"}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontWeight: "700" }}>
            Clock Out: {formatTo12Hour(shift?.clockOut)}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>
            {shift?.clockOutLocation || "Location"}
          </Text>
        </View>
      </View>
    </View>

    {/* Divider */}
    <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 }} />

    {/* ---------- DAILY SHIFT REPORT ---------- */}
   <View style={{ marginHorizontal: 16, marginTop: 22 }}>
          <Text style={{ fontWeight: "800", fontSize: 18 }}>
            Daily Shift Report
          </Text>

          <Text style={{ color: "#6B7280", marginTop: 6 }}>
            Include details about activities, medications, meals, mood,
            interactions, health observations, and any concerns.
          </Text>

          <TextInput
            placeholder="Begin your report"
            multiline
            value={reportText}
            onChangeText={setReportText}
            editable={!isSubmitted} // 🔒 LOCK AFTER SUBMIT
            style={{
              backgroundColor: isSubmitted ? "#E5E7EB" : "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 5,
              marginTop: 14,
              minHeight: 150,
              padding: 14,
              textAlignVertical: "top",
            }}
          />

          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 8 }}>
            Recommended: Minimum 1000 words for the report.
          </Text>

          {!isSubmitted && (
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 14,
              }}
            >
              <Pressable
                onPress={saveDraft}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#14532D",
                  paddingVertical: 12,
                  borderRadius: 5,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#14532D",
                    fontWeight: "700",
                  }}
                >
                  Save as Draft
                </Text>
              </Pressable>

              <Pressable
                onPress={submitReport}
                style={{
                  flex: 1,
                  backgroundColor: "#14532D",
                  paddingVertical: 12,
                  borderRadius: 5,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#fff",
                    fontWeight: "700",
                  }}
                >
                  Submit
                </Text>
              </Pressable>
            </View>
          )}

          {isSubmitted && (
            <Text
              style={{
                marginTop: 14,
                color: "#16A34A",
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Report submitted
            </Text>
          )}
        

        </View>

    {/* ---------- MORE ACTIONS ---------- */}
    <View style={{ marginHorizontal: 16, marginTop: 26 }}>
      <Text style={{ fontWeight: "800", fontSize: 18 }}>
        More Actions
      </Text>

      <ActionCard
        title="Critical Incident Reporting"
        description="For serious incidents requiring immediate management attention."
        btnText="Report Critical Incident"
        bg="#FEE2E2"
        color="#DC2626"
        icon="alert"
      />

      <ActionCard
        title="Contact Note"
        description="For serious incidents requiring immediate management attention."
        btnText="Contact Note"
        bg="#DBEAFE"
        color="#2563EB"
        icon="account"
      />

      <ActionCard
        title="Noteworthy Event"
        description="For serious incidents requiring immediate management attention."
        btnText="Noteworthy Event"
        bg="#FFEDD5"
        color="#F97316"
        icon="note-text"
      />

      <ActionCard
        title="Follow through"
        description="For serious incidents requiring immediate management attention."
        btnText="Follow Through"
        bg="#DCFCE7"
        color="#16A34A"
        icon="repeat"
      />
    </View>
  </>
)}

{/* ================= MEDICATION TAB ================= */}
{activeTab === "Medication" && (
  <View style={{ margin: 16 }}>
    <Text style={{ fontWeight: "700" }}>
       <MedicationTab shift={shift}  />
    </Text>
  </View>
)}

{/* ================= TRANSPORT TAB ================= */}
{activeTab === "Transport" && (
  <ReportTransportationTab
    shift={shift}
    shiftId={shift.id}
  />
)}


        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
