import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useState } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { db, storage } from "../src/firebase/config";
import { Ionicons } from "@expo/vector-icons";

/* ---------------- HELPERS ---------------- */
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

const reverseGeocode = async (coords) => {
  const res = await Location.reverseGeocodeAsync(coords);
  if (!res?.[0]) return "";
  const a = res[0];
  return `${a.name || ""} ${a.street || ""}, ${a.city || ""}`;
};

const nowISO = () => new Date().toISOString();

/* ---------------- COMPONENT ---------------- */
export default function ReportTransportationTab({ shift, shiftId }) {
  const isTransportation =
    shift?.categoryName?.toLowerCase() === "transportation" ||
    shift?.shiftCategory?.toLowerCase() === "transportation" ||
    shift?.categoryName?.toLowerCase() === "supervised visitation + transportation" ||
    shift?.shiftCategory?.toLowerCase() === "supervised visitation + transportation";

  const planned = shift?.shiftPoints?.[0] || {};

  /* DRIVE STATE */
  const [isDriving, setIsDriving] = useState(false);
  const [prevCoords, setPrevCoords] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [stopCoords, setStopCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [distance, setDistance] = useState(0);
  const [locationSub, setLocationSub] = useState(null);

  /* POINTS */
  const [startPoint, setStartPoint] = useState("");
  const [stopPoint, setStopPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");

  /* RECEIPTS */
  const [receipts, setReceipts] = useState([]);

  /* COMMENTS */
  const [comments, setComments] = useState("");

  const [approvedKm, setApprovedKm] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  // ✅ Local UI update (so you see Done At instantly)
  const [pickupDoneAtLocal, setPickupDoneAtLocal] = useState(planned.pickupDoneAt || null);
  const [dropDoneAtLocal, setDropDoneAtLocal] = useState(planned.dropDoneAt || null);
  const [pickupActualLocal, setPickupActualLocal] = useState(planned.pickupActualLocation || null);
  const [dropActualLocal, setDropActualLocal] = useState(planned.dropActualLocation || null);

  const nowTimeHHMM = () =>
  new Date().toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });


  /* ---------------- OPEN MAP WITH ROUTE ---------------- */
  const openRouteInMaps = () => {
    if (!isTransportation) return;

    const pickup = planned.pickupLocation || shift.pickupLocation || "";
    const drop = planned.dropLocation || shift.dropLocation || "";

    if (!pickup || !drop) {
      Alert.alert("Error", "Pickup or Drop address missing");
      return;
    }

    const origin = encodeURIComponent(pickup);
    const destination = encodeURIComponent(drop);

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    Linking.openURL(url);
  };

  /* ---------------- START DRIVE ---------------- */
  const startDrive = async () => {
    openRouteInMaps();

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Location permission denied");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setStartCoords(loc.coords);
    setPrevCoords(loc.coords);
    setDistance(0);
    setIsDriving(true);

    const addr = await reverseGeocode(loc.coords);
    setStartPoint(addr);

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (pos) => {
        setPrevCoords((prev) => {
          if (!prev) return pos.coords;

          const d = getDistanceKm(
            prev.latitude,
            prev.longitude,
            pos.coords.latitude,
            pos.coords.longitude
          );

          if (d < 0.01) return prev; // ignore GPS noise
          setDistance((old) => old + d);

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

    const addr = await reverseGeocode(loc.coords);
    setEndPoint(addr);
  };

  /* ---------------- PICK RECEIPT ---------------- */
  const pickReceipt = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (res.canceled) return;

    const asset = res.assets[0];
    setReceipts((prev) => [
      ...prev,
      { uri: asset.uri, name: asset.fileName || `receipt_${Date.now()}.jpg` },
    ]);
  };

  /* ---------------- DELETE RECEIPT ---------------- */
  const deleteReceipt = async (r) => {
    try {
      if (r.path) {
        await deleteObject(ref(storage, r.path));
        await updateDoc(doc(db, "shifts", String(shiftId)), {
          expenseReceiptUrls: arrayRemove(r),
        });
      }
      setReceipts((prev) => prev.filter((x) => x !== r));
    } catch (e) {
      Alert.alert("Error", "Failed to delete receipt");
    }
  };

  /* ---------------- UPLOAD RECEIPTS ---------------- */
  const uploadReceipts = async () => {
    const uploaded = [];

    for (const r of receipts) {
      if (r.url) continue;

      const blob = await (await fetch(r.uri)).blob();
      const storageRef = ref(
        storage,
        `shiftReceipts/${shiftId}/${Date.now()}_${r.name}`
      );

      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      uploaded.push({
        name: r.name,
        url,
        path: storageRef.fullPath,
        uploadedAt: new Date(),
      });
    }
    return uploaded;
  };

  /* ---------------- NEW: capture current location ---------------- */
  const getCurrentAddressAndCoords = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Location permission denied");
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const addr = await reverseGeocode(loc.coords);

    return {
      addr,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      time: nowISO(),
    };
  };

  /* ---------------- NEW: Pickup buttons ---------------- */
  const savePickupLocationOnly = async () => {
    try {
      if (!isDriving) {
        Alert.alert("Start Drive", "Please start drive first.");
        return;
      }

      const data = await getCurrentAddressAndCoords();
      if (!data) return;

      const shiftRef = doc(db, "shifts", String(shiftId));

      await updateDoc(shiftRef, {
        "shiftPoints.0.pickupActualLocation": data.addr,
        "shiftPoints.0.pickupLat": data.lat,
        "shiftPoints.0.pickupLng": data.lng,
      });

      setPickupActualLocal(data.addr);
      Alert.alert("Saved", "Pickup location captured.");
    } catch (e) {
      Alert.alert("Error", "Failed to save pickup location");
    }
  };

  const markPicked = async () => {
    try {
      if (!isDriving) {
        Alert.alert("Start Drive", "Please start drive first.");
        return;
      }

      const data = await getCurrentAddressAndCoords();
      if (!data) return;

      const shiftRef = doc(db, "shifts", String(shiftId));

      await updateDoc(shiftRef, {
        "shiftPoints.0.pickupDoneAt": data.time,
        "shiftPoints.0.pickupActualLocation": data.addr,
        "shiftPoints.0.pickupLat": data.lat,
        "shiftPoints.0.pickupLng": data.lng,
      });

      setPickupDoneAtLocal(data.time);
      setPickupActualLocal(data.addr);
      Alert.alert("Picked", "Pickup marked successfully.");
    } catch (e) {
      Alert.alert("Error", "Failed to mark pickup");
    }
  };

  /* ---------------- NEW: Drop buttons ---------------- */
  const saveDropLocationOnly = async () => {
    try {
      if (!isDriving) {
        Alert.alert("Start Drive", "Please start drive first.");
        return;
      }

      const data = await getCurrentAddressAndCoords();
      if (!data) return;

      const shiftRef = doc(db, "shifts", String(shiftId));

      await updateDoc(shiftRef, {
        "shiftPoints.0.dropActualLocation": data.addr,
        "shiftPoints.0.dropLat": data.lat,
        "shiftPoints.0.dropLng": data.lng,
      });

      setDropActualLocal(data.addr);
      Alert.alert("Saved", "Drop location captured.");
    } catch (e) {
      Alert.alert("Error", "Failed to save drop location");
    }
  };

  const markDropped = async () => {
    try {
      if (!isDriving) {
        Alert.alert("Start Drive", "Please start drive first.");
        return;
      }

      const data = await getCurrentAddressAndCoords();
      if (!data) return;

      const shiftRef = doc(db, "shifts", String(shiftId));

      await updateDoc(shiftRef, {
        "shiftPoints.0.dropDoneAt": data.time,
        "shiftPoints.0.dropActualLocation": data.addr,
        "shiftPoints.0.dropLat": data.lat,
        "shiftPoints.0.dropLng": data.lng,
      });

      setDropDoneAtLocal(data.time);
      setDropActualLocal(data.addr);
      Alert.alert("Dropped", "Drop marked successfully.");
    } catch (e) {
      Alert.alert("Error", "Failed to mark drop");
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    try {
      const shiftRef = doc(db, "shifts", String(shiftId));
      const payload = {};

      if (startCoords && endCoords) {
        let totalKm = 0;

        if (stopCoords) {
          totalKm =
            getDistanceKm(
              startCoords.latitude,
              startCoords.longitude,
              stopCoords.latitude,
              stopCoords.longitude
            ) +
            getDistanceKm(
              stopCoords.latitude,
              stopCoords.longitude,
              endCoords.latitude,
              endCoords.longitude
            );
        } else {
          totalKm = getDistanceKm(
            startCoords.latitude,
            startCoords.longitude,
            endCoords.latitude,
            endCoords.longitude
          );
        }

        payload.extraShiftPoints = arrayUnion({
          startLocation: startPoint,
          stopLocation: stopPoint || null,
          stopLat: stopCoords?.latitude || null,
          stopLng: stopCoords?.longitude || null,
          endLocation: endPoint,
          totalKilometer: Number(totalKm.toFixed(2)),
          staffTraveledKM: Number(distance.toFixed(2)),
          approvedKM: approvedKm ? Number(approvedKm) : null,
          approvedBy: approvedBy || null,
          createdAt: new Date(),
        });
      }

      if (comments) payload.travelComments = comments;

      if (receipts.length) {
        const uploaded = await uploadReceipts();
        payload.expenseReceiptUrls = arrayUnion(...uploaded);
      }

      await updateDoc(shiftRef, payload);
      Alert.alert("Success", "Transportation report submitted");
    } catch (e) {
      Alert.alert("Error", "Submission failed");
    }
  };

  const totalKm =
    startCoords && endCoords
      ? stopCoords
        ? (
            getDistanceKm(
              startCoords.latitude,
              startCoords.longitude,
              stopCoords.latitude,
              stopCoords.longitude
            ) +
            getDistanceKm(
              stopCoords.latitude,
              stopCoords.longitude,
              endCoords.latitude,
              endCoords.longitude
            )
          ).toFixed(2)
        : getDistanceKm(
            startCoords.latitude,
            startCoords.longitude,
            endCoords.latitude,
            endCoords.longitude
          ).toFixed(2)
      : "0.00";

  /* ---------------- UI ---------------- */
  return (
    <ScrollView style={{ padding: 16 }}>
      {/* ================= TRANSPORTATION SHIFT ================= */}
      {isTransportation && (
        <>
          {/* Pickup row header with buttons */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <Text style={styles.label}>Pickup Address</Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={savePickupLocationOnly}
                disabled={!isDriving}
                style={{ opacity: isDriving ? 1 : 0.4 }}
              >
                <Ionicons name="map-outline" size={18} color="#14532D" />
              </Pressable>

              <Pressable
                onPress={markPicked}
                disabled={!isDriving || Boolean(pickupDoneAtLocal)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: !isDriving || pickupDoneAtLocal ? "#d1d5db" : "#14532D",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
                  Picked
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={styles.input}
            value={planned.pickupLocation || ""}
            editable={false}
          />
          <Text style={styles.meta}>Scheduled At: {planned.pickupTime || "--"}</Text>
          <Text style={styles.meta}>Done At: {pickupDoneAtLocal || "Pending"}</Text>
          {pickupActualLocal ? (
            <Text style={styles.meta}>Actual Pickup: {pickupActualLocal}</Text>
          ) : null}

          {/* Drop row header with buttons */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <Text style={styles.label}>Drop Address</Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={saveDropLocationOnly}
                disabled={!isDriving}
                style={{ opacity: isDriving ? 1 : 0.4 }}
              >
                <Ionicons name="map-outline" size={18} color="#14532D" />
              </Pressable>

              <Pressable
                onPress={markDropped}
                disabled={!isDriving || Boolean(dropDoneAtLocal)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: !isDriving || dropDoneAtLocal ? "#d1d5db" : "#14532D",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
                  Dropped
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={styles.input}
            value={planned.dropLocation || ""}
            editable={false}
          />
          <Text style={styles.meta}>Scheduled At: {planned.dropTime || "--"}</Text>
          <Text style={styles.meta}>Done At: {dropDoneAtLocal || "Pending"}</Text>
          {dropActualLocal ? (
            <Text style={styles.meta}>Actual Drop: {dropActualLocal}</Text>
          ) : null}

          {/* ================= ADD STOP ================= */}
          <Text style={styles.label}>Add a Stop</Text>
          <GooglePlacesAutocomplete
            placeholder="Enter stop location"
            fetchDetails={true}
            onPress={(data, details = null) => {
              if (!details) return;
              const { lat, lng } = details.geometry.location;
              setStopPoint(details.formatted_address);
              setStopCoords({ latitude: lat, longitude: lng });
            }}
            query={{
              key: "AIzaSyAqsfeARorPkCqHI61693V1YDa8Gv49SpA",
              language: "en",
              components: "country:ca",
            }}
            styles={{
              textInput: styles.input,
              listView: { zIndex: 1000 },
            }}
          />
        </>
      )}

      {/* ================= COMMON FOR BOTH ================= */}
      <Pressable
        onPress={isDriving ? endDrive : startDrive}
        style={{
          backgroundColor: isDriving ? "#DC2626" : "#14532D",
          padding: 14,
          borderRadius: 6,
          marginTop: 16,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {isDriving ? "End Drive" : "Start Drive"}
        </Text>
      </Pressable>

      {/* ================= NON-TRANSPORTATION ================= */}
      {!isTransportation && (
        <>
          <Text style={styles.label}>Starting Point</Text>
          <TextInput style={styles.input} value={startPoint} editable={false} />

          <Text style={styles.label}>Ending Point</Text>
          <TextInput style={styles.input} value={endPoint} editable={false} />
        </>
      )}

      <Text style={styles.label}>Total Kilometers</Text>
      <TextInput style={styles.input} value={`${totalKm} km`} editable={false} />

      <Text style={styles.label}>Kilometers Traveled by Staff</Text>
      <TextInput
        style={styles.input}
        value={`${distance.toFixed(2)} km`}
        editable={false}
      />

      <Text style={styles.label}>Approved Kilometers</Text>
      <TextInput
        style={styles.input}
        value={approvedKm}
        onChangeText={setApprovedKm}
        placeholder="Enter approved kilometers"
      />

      <Text style={styles.label}>Approved By</Text>
      <TextInput
        style={styles.input}
        value={approvedBy}
        onChangeText={setApprovedBy}
        placeholder="Enter approver name"
      />

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

      <Text style={styles.label}>Travel Comments</Text>
      <TextInput
        multiline
        value={comments}
        onChangeText={setComments}
        placeholder="Add travel notes or comments"
        style={[styles.input, { height: 90 }]}
      />

      <Pressable style={styles.submitBtn} onPress={handleSubmit}>
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
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
    backgroundColor: "#f9fafb",
  },
  uploadBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 6,
    marginTop: 6,
    alignItems: "center",
  },
  driveText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: "#14532D",
    padding: 14,
    borderRadius: 6,
    marginTop: 20,
  },
};
