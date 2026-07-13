import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../src/firebase/config";
import { Ionicons } from "@expo/vector-icons";
import { calculateRouteDistance, reverseGeocode } from "../src/utils/mapboxHelper";

const OFFICE_ADDRESS = "10110 124 St NW, Edmonton, AB T5N 1P6, Canada";
const MILEAGE_RATE = 0.72; // $0.72 per km

/* ---------------- GPS haversine (for live tracking) ---------------- */
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const nowISO = () => new Date().toISOString();

/* ---------------- COMPONENT ----------------
 * `section` selects which half of the report to render — "transportation" or
 * "expense" — deciding *whether* to show either one happens one screen earlier
 * (Shift Actions), not inside this component. */
export default function ReportTransportationTab({ shift, shiftId, section = "transportation" }) {
  const isTransportation =
    shift?.categoryName?.toLowerCase() === "transportation" ||
    shift?.shiftCategory?.toLowerCase() === "transportation" ||
    shift?.categoryName?.toLowerCase() === "supervised visitation + transportation" ||
    shift?.shiftCategory?.toLowerCase() === "supervised visitation + transportation";

  const planned = shift?.shiftPoints?.[0] || {};

  // Pre-saved km from a previous submission
  const saved = shift?.extraShiftPoints?.slice(-1)[0] || {};

  /* DRIVE STATE */
  const [isDriving, setIsDriving] = useState(false);
  const [prevCoords, setPrevCoords] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [stopCoords, setStopCoords] = useState(null);
  const [liveKm, setLiveKm] = useState(parseFloat(saved.staffTraveledKM || 0));
  const [locationSub, setLocationSub] = useState(null);

  /* POINTS */
  const [startPoint, setStartPoint] = useState(saved.startLocation || "");
  const [stopPoint, setStopPoint] = useState(saved.stopLocation || "");
  const [endPoint, setEndPoint] = useState(saved.endLocation || "");

  /* OFFICE → PICKUP and DROP → OFFICE (Mapbox route calculations) */
  // Priority: shiftPoints (saved at creation) → extraShiftPoints → null (triggers auto-calc)
  const _o2p = planned.officeToPickupKm > 0 ? planned.officeToPickupKm
    : saved.officeToPickupKm > 0 ? saved.officeToPickupKm : null;
  const _d2o = planned.dropToOfficeKm > 0 ? planned.dropToOfficeKm
    : saved.dropToOfficeKm > 0 ? saved.dropToOfficeKm : null;
  const [officeToPickupKm, setOfficeToPickupKm] = useState(_o2p);
  const [dropToOfficeKm, setDropToOfficeKm] = useState(_d2o);
  const [kmLoading, setKmLoading] = useState(false);

  /* MISC */
  const [receipts, setReceipts] = useState([]);
  const [comments, setComments] = useState(saved.travelComments || "");
  const [approvedKm, setApprovedKm] = useState(saved.approvedKM ? String(saved.approvedKM) : "");
  const [approvedBy, setApprovedBy] = useState(saved.approvedBy || "");
  const [expenseAmount, setExpenseAmount] = useState(saved.expenseAmount ? String(saved.expenseAmount) : "");

  /* PICKUP / DROP ACTUAL */
  const [pickupDoneAtLocal, setPickupDoneAtLocal] = useState(planned.pickupDoneAt || null);
  const [dropDoneAtLocal, setDropDoneAtLocal] = useState(planned.dropDoneAt || null);
  const [pickupActualLocal, setPickupActualLocal] = useState(planned.pickupActualLocation || null);
  const [dropActualLocal, setDropActualLocal] = useState(planned.dropActualLocation || null);

  /* ── Auto-calculate Office→Pickup and Drop→Office on mount ── */
  useEffect(() => {
    if (!isTransportation) return;
    const pickupAddr = planned.pickupLocation || shift?.pickupLocation;
    const dropAddr = planned.dropLocation || shift?.dropLocation;
    if (!pickupAddr && !dropAddr) return;
    // Skip if already have positive values
    if (officeToPickupKm > 0 && dropToOfficeKm > 0) return;

    (async () => {
      setKmLoading(true);
      try {
        const [o2p, d2o] = await Promise.all([
          pickupAddr ? calculateRouteDistance([OFFICE_ADDRESS, pickupAddr]) : null,
          dropAddr ? calculateRouteDistance([dropAddr, OFFICE_ADDRESS]) : null,
        ]);
        if (o2p?.km != null) setOfficeToPickupKm(parseFloat(o2p.km.toFixed(2)));
        if (d2o?.km != null) setDropToOfficeKm(parseFloat(d2o.km.toFixed(2)));
      } catch (e) {
        console.warn("KM calculation failed:", e);
      } finally {
        setKmLoading(false);
      }
    })();
  }, []);

  /* Derived totals */
  const totalKm = parseFloat(
    ((officeToPickupKm || 0) + liveKm + (dropToOfficeKm || 0)).toFixed(2)
  );
  const mileageAmount = parseFloat((totalKm * MILEAGE_RATE).toFixed(2));

  const nowTimeHHMM = () =>
    new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });

  /* ---------------- OPEN ROUTE IN MAPS ---------------- */
  const openRouteInMaps = () => {
    const pickup = planned.pickupLocation || shift.pickupLocation || "";
    const drop = planned.dropLocation || shift.dropLocation || "";
    if (!pickup || !drop) {
      Alert.alert("Error", "Pickup or Drop address missing");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(drop)}`;
    Linking.openURL(url);
  };

  /* ---------------- START DRIVE ---------------- */
  const startDrive = async () => {
    if (isTransportation) openRouteInMaps();

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Location permission denied");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setStartCoords(loc.coords);
    setPrevCoords(loc.coords);
    setLiveKm(0);
    setIsDriving(true);

    (async () => {
      const addr = await reverseGeocode(loc.coords.longitude, loc.coords.latitude);
      if (addr) setStartPoint(addr);
    })();

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (pos) => {
        setPrevCoords((prev) => {
          if (!prev) return pos.coords;
          const d = getDistanceKm(
            prev.latitude, prev.longitude,
            pos.coords.latitude, pos.coords.longitude
          );
          if (d < 0.01) return prev;
          setLiveKm((old) => old + d);
          return pos.coords;
        });
      }
    );
    setLocationSub(sub);
  };

  /* ---------------- END DRIVE ---------------- */
  const endDrive = async () => {
    locationSub?.remove();
    setLocationSub(null);
    setIsDriving(false);

    const loc = await Location.getCurrentPositionAsync({});
    setEndCoords(loc.coords);

    (async () => {
      const addr = await reverseGeocode(loc.coords.longitude, loc.coords.latitude);
      if (addr) setEndPoint(addr);
    })();
  };

  /* ---------------- CAPTURE CURRENT LOCATION ---------------- */
  const getCurrentAddressAndCoords = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Location permission denied");
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const addr = await reverseGeocode(loc.coords.longitude, loc.coords.latitude);
    return { addr, lat: loc.coords.latitude, lng: loc.coords.longitude, time: nowISO() };
  };

  /* ---------------- PICKUP BUTTONS ---------------- */
  const savePickupLocationOnly = async () => {
    if (!isDriving) { Alert.alert("Start Drive", "Please start drive first."); return; }
    const data = await getCurrentAddressAndCoords();
    if (!data) return;
    await updateDoc(doc(db, "shifts", String(shiftId)), {
      "shiftPoints.0.pickupActualLocation": data.addr,
      "shiftPoints.0.pickupLat": data.lat,
      "shiftPoints.0.pickupLng": data.lng,
    });
    setPickupActualLocal(data.addr);
    Alert.alert("Saved", "Pickup location captured.");
  };

  const markPicked = async () => {
    if (!isDriving) { Alert.alert("Start Drive", "Please start drive first."); return; }
    const data = await getCurrentAddressAndCoords();
    if (!data) return;
    await updateDoc(doc(db, "shifts", String(shiftId)), {
      "shiftPoints.0.pickupDoneAt": data.time,
      "shiftPoints.0.pickupActualLocation": data.addr,
      "shiftPoints.0.pickupLat": data.lat,
      "shiftPoints.0.pickupLng": data.lng,
    });
    setPickupDoneAtLocal(data.time);
    setPickupActualLocal(data.addr);
    Alert.alert("Picked", "Pickup marked successfully.");
  };

  /* ---------------- DROP BUTTONS ---------------- */
  const saveDropLocationOnly = async () => {
    if (!isDriving) { Alert.alert("Start Drive", "Please start drive first."); return; }
    const data = await getCurrentAddressAndCoords();
    if (!data) return;
    await updateDoc(doc(db, "shifts", String(shiftId)), {
      "shiftPoints.0.dropActualLocation": data.addr,
      "shiftPoints.0.dropLat": data.lat,
      "shiftPoints.0.dropLng": data.lng,
    });
    setDropActualLocal(data.addr);
    Alert.alert("Saved", "Drop location captured.");
  };

  const markDropped = async () => {
    if (!isDriving) { Alert.alert("Start Drive", "Please start drive first."); return; }
    const data = await getCurrentAddressAndCoords();
    if (!data) return;
    await updateDoc(doc(db, "shifts", String(shiftId)), {
      "shiftPoints.0.dropDoneAt": data.time,
      "shiftPoints.0.dropActualLocation": data.addr,
      "shiftPoints.0.dropLat": data.lat,
      "shiftPoints.0.dropLng": data.lng,
    });
    setDropDoneAtLocal(data.time);
    setDropActualLocal(data.addr);
    Alert.alert("Dropped", "Drop marked successfully.");
  };

  /* ---------------- RECEIPTS ---------------- */
  const pickReceipt = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets[0];
    setReceipts((prev) => [...prev, { uri: asset.uri, name: asset.fileName || `receipt_${Date.now()}.jpg` }]);
  };

  const deleteReceipt = async (r) => {
    try {
      if (r.path) {
        await deleteObject(ref(storage, r.path));
        await updateDoc(doc(db, "shifts", String(shiftId)), { expenseReceiptUrls: arrayRemove(r) });
      }
      setReceipts((prev) => prev.filter((x) => x !== r));
    } catch (e) {
      Alert.alert("Error", "Failed to delete receipt");
    }
  };

  const uploadReceipts = async () => {
    const uploaded = [];
    for (const r of receipts) {
      if (r.url) continue;
      const blob = await (await fetch(r.uri)).blob();
      const storageRef = ref(storage, `shiftReceipts/${shiftId}/${Date.now()}_${r.name}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      uploaded.push({ name: r.name, url, path: storageRef.fullPath, uploadedAt: new Date() });
    }
    return uploaded;
  };

  /* ---------------- SUBMIT TRANSPORTATION ---------------- */
  const handleSubmitTransportation = async () => {
    try {
      const entry = {
        startLocation: startPoint || null,
        stopLocation: stopPoint || null,
        endLocation: endPoint || null,
        officeToPickupKm: isTransportation ? (officeToPickupKm ?? null) : null,
        dropToOfficeKm: isTransportation ? (dropToOfficeKm ?? null) : null,
        staffTraveledKM: parseFloat(liveKm.toFixed(2)),
        totalKm: isTransportation ? totalKm : parseFloat(liveKm.toFixed(2)),
        mileageAmount: isTransportation ? mileageAmount : null,
        approvedKM: approvedKm ? Number(approvedKm) : null,
        approvedBy: approvedBy || null,
        travelComments: comments || null,
        createdAt: new Date(),
      };
      const payload = { extraShiftPoints: arrayUnion(entry), transportationReported: true };
      if (comments) payload.travelComments = comments;
      await updateDoc(doc(db, "shifts", String(shiftId)), payload);
      Alert.alert("Success", "Transportation report submitted");
    } catch (e) {
      Alert.alert("Error", "Submission failed");
    }
  };

  /* ---------------- SUBMIT EXPENSE ---------------- */
  const handleSubmitExpense = async () => {
    try {
      const payload = { expenseReported: true };
      if (expenseAmount) payload.expenseAmount = Number(expenseAmount);

      if (receipts.length) {
        const uploaded = await uploadReceipts();
        payload.expenseReceiptUrls = arrayUnion(...uploaded);
      }

      await updateDoc(doc(db, "shifts", String(shiftId)), payload);
      Alert.alert("Success", "Expense report submitted");
    } catch (e) {
      Alert.alert("Error", "Submission failed");
    }
  };

  /* ---------------- UI ---------------- */
  if (section === "expense") {
    return (
      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.label}>Expense Amount ($)</Text>
        <TextInput style={styles.input} value={expenseAmount} onChangeText={setExpenseAmount} placeholder="Enter expense amount" keyboardType="numeric" />

        <Text style={styles.label}>Receipts</Text>
        <Pressable style={styles.uploadBtn} onPress={pickReceipt}>
          <Text>Upload Receipt</Text>
        </Pressable>
        {receipts.map((r, i) => (
          <View key={i} style={{ marginTop: 8 }}>
            <Text onPress={() => Linking.openURL(r.url || r.uri)}>{r.name}</Text>
            <Pressable onPress={() => deleteReceipt(r)}>
              <Text style={{ color: "red" }}>Delete</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.submitBtn} onPress={handleSubmitExpense}>
          <Text style={styles.driveText}>Submit</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      {isTransportation && (
        <>
          {/* Pickup */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <Text style={styles.label}>Pickup Address</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable onPress={savePickupLocationOnly} disabled={!isDriving} style={{ opacity: isDriving ? 1 : 0.4 }}>
                <Ionicons name="map-outline" size={18} color="#14532D" />
              </Pressable>
              <Pressable
                onPress={markPicked}
                disabled={!isDriving || Boolean(pickupDoneAtLocal)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: !isDriving || pickupDoneAtLocal ? "#d1d5db" : "#14532D" }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Picked</Text>
              </Pressable>
            </View>
          </View>
          <TextInput style={styles.input} value={planned.pickupLocation || ""} editable={false} />
          <Text style={styles.meta}>Scheduled At: {planned.pickupTime || "--"}</Text>
          <Text style={styles.meta}>Done At: {pickupDoneAtLocal || "Pending"}</Text>
          {pickupActualLocal ? <Text style={styles.meta}>Actual Pickup: {pickupActualLocal}</Text> : null}

          {/* Drop */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <Text style={styles.label}>Drop Address</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable onPress={saveDropLocationOnly} disabled={!isDriving} style={{ opacity: isDriving ? 1 : 0.4 }}>
                <Ionicons name="map-outline" size={18} color="#14532D" />
              </Pressable>
              <Pressable
                onPress={markDropped}
                disabled={!isDriving || Boolean(dropDoneAtLocal)}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: !isDriving || dropDoneAtLocal ? "#d1d5db" : "#14532D" }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Dropped</Text>
              </Pressable>
            </View>
          </View>
          <TextInput style={styles.input} value={planned.dropLocation || ""} editable={false} />
          <Text style={styles.meta}>Scheduled At: {planned.dropTime || "--"}</Text>
          <Text style={styles.meta}>Done At: {dropDoneAtLocal || "Pending"}</Text>
          {dropActualLocal ? <Text style={styles.meta}>Actual Drop: {dropActualLocal}</Text> : null}
        </>
      )}

      {/* Drive Button */}
      <Pressable
        onPress={isDriving ? endDrive : startDrive}
        style={{ backgroundColor: isDriving ? "#DC2626" : "#14532D", padding: 14, borderRadius: 6, marginTop: 16 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {isDriving ? "End Drive" : "Start Drive"}
        </Text>
      </Pressable>

      {/* KM Breakdown */}
      <View style={styles.kmCard}>
        <Text style={styles.kmTitle}>{isTransportation ? "Kilometer Breakdown" : "Kilometers Traveled"}</Text>
        {isTransportation && kmLoading && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ActivityIndicator size="small" color="#14532D" />
            <Text style={{ fontSize: 12, color: "#6B7280" }}>Calculating route distances…</Text>
          </View>
        )}

        {isTransportation && (
          <View style={styles.kmRow}>
            <Text style={styles.kmLabel}>Office → Pickup</Text>
            <Text style={styles.kmValue}>
              {officeToPickupKm != null ? `${officeToPickupKm.toFixed(2)} km` : "—"}
            </Text>
          </View>
        )}

        <View style={styles.kmRow}>
          <Text style={styles.kmLabel}>{isTransportation ? "Staff Traveled (Live GPS)" : "Distance Traveled (GPS)"}</Text>
          <Text style={styles.kmValue}>{liveKm.toFixed(2)} km</Text>
        </View>

        {isTransportation && (
          <View style={styles.kmRow}>
            <Text style={styles.kmLabel}>Drop → Office</Text>
            <Text style={styles.kmValue}>
              {dropToOfficeKm != null ? `${dropToOfficeKm.toFixed(2)} km` : "—"}
            </Text>
          </View>
        )}

        <View style={[styles.kmRow, styles.kmTotalRow]}>
          <Text style={styles.kmTotalLabel}>Total KM</Text>
          <Text style={styles.kmTotalValue}>{isTransportation ? totalKm.toFixed(2) : liveKm.toFixed(2)} km</Text>
        </View>

        {isTransportation && (
          <View style={[styles.kmRow, { marginTop: 4 }]}>
            <Text style={[styles.kmLabel, { color: "#14532D", fontWeight: "700" }]}>
              Mileage @ ${MILEAGE_RATE}/km
            </Text>
            <Text style={[styles.kmValue, { color: "#14532D", fontWeight: "700" }]}>
              ${mileageAmount.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Approved KM (transportation category only) */}
      {isTransportation && (
        <>
          <Text style={styles.label}>Approved Kilometers</Text>
          <TextInput style={styles.input} value={approvedKm} onChangeText={setApprovedKm} placeholder="Enter approved kilometers" keyboardType="numeric" />

          <Text style={styles.label}>Approved By</Text>
          <TextInput style={styles.input} value={approvedBy} onChangeText={setApprovedBy} placeholder="Enter approver name" />
        </>
      )}

      <Text style={styles.label}>Travel Comments</Text>
      <TextInput
        multiline value={comments} onChangeText={setComments}
        placeholder="Add travel notes or comments"
        style={[styles.input, { height: 90 }]}
      />

      <Pressable style={styles.submitBtn} onPress={handleSubmitTransportation}>
        <Text style={styles.driveText}>Submit</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  label: { marginTop: 12, fontWeight: "600" },
  meta: { fontSize: 12, color: "#6B7280" },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6,
    padding: 10, marginTop: 6, backgroundColor: "#f9fafb",
  },
  uploadBtn: {
    borderWidth: 1, borderColor: "#d1d5db", padding: 12,
    borderRadius: 6, marginTop: 6, alignItems: "center",
  },
  driveText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  submitBtn: { backgroundColor: "#14532D", padding: 14, borderRadius: 6, marginTop: 20 },

  kmCard: {
    marginTop: 20, borderRadius: 12, borderWidth: 1, borderColor: "#d1fae5",
    backgroundColor: "#f0fdf4", padding: 14,
  },
  kmTitle: { fontSize: 13, fontWeight: "700", color: "#14532D", marginBottom: 10 },
  kmRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#d1fae5",
  },
  kmLabel: { fontSize: 13, color: "#374151" },
  kmValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  kmTotalRow: {
    borderTopWidth: 2, borderTopColor: "#14532D",
    borderBottomWidth: 0, marginTop: 4, paddingTop: 10,
  },
  kmTotalLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  kmTotalValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
};
