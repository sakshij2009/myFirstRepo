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
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../src/firebase/config";

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



/* ---------------- COMPONENT ---------------- */
export default function ReportTransportationTab({ shift, shiftId }) {
  const isTransportation =
    shift?.categoryName?.toLowerCase() === "transportation" ||
    shift?.shiftCategory?.toLowerCase() === "transportation";

  const planned = shift?.shiftPoints?.[0] || {};

  /* EXTRA TRANSPORT TOGGLE */
  const [showExtraTransport, setShowExtraTransport] = useState(
    !isTransportation
  );

  /* DRIVE STATE */
  const [isDriving, setIsDriving] = useState(false);
  const [prevCoords, setPrevCoords] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [distance, setDistance] = useState(0);
  const [locationSub, setLocationSub] = useState(null);
  

  /* POINTS */
  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  

  /* RECEIPTS */
  const [receipts, setReceipts] = useState([]);

  /* COMMENTS */
  const [comments, setComments] = useState("");

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

          // inside watchPositionAsync
            const distanceToPickup = getDistanceKm(
            pos.coords.latitude,
            pos.coords.longitude,
            planned.pickupLat,
            planned.pickupLng
            );

            if (distanceToPickup < 0.05 && !pickupDone) {
            updateDoc(shiftRef, {
                "shiftPoints.0.pickupDoneAt": new Date(),
            });
            }

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

  /* ---------------- OPEN MAP WITH ROUTE ---------------- */
const openRouteInMaps = () => {
  const pickup =
    planned.pickupLocation ||
    shift.pickupLocation ||
    "";

  const drop =
    planned.dropLocation ||
    shift.dropLocation ||
    "";

  const visit =
    planned.visitLocation ||
    shift.visitLocation ||
    "";

  if (!pickup || !drop) {
    Alert.alert("Error", "Pickup or Drop address missing");
    return;
  }

  const origin = encodeURIComponent(pickup);
  const destination = encodeURIComponent(drop);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

  if (visit && visit.trim() !== "") {
    url += `&waypoints=${encodeURIComponent(visit)}`;
  }

  Linking.openURL(url);
};


  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    try {
      const shiftRef = doc(db, "shifts", String(shiftId));
      const payload = {};

      if (startCoords && endCoords) {
        const totalKm = getDistanceKm(
          startCoords.latitude,
          startCoords.longitude,
          endCoords.latitude,
          endCoords.longitude
        );

        payload.extraShiftPoints = arrayUnion({
          startLocation: startPoint,
          endLocation: endPoint,
          totalKilometer: Number(totalKm.toFixed(2)),
          staffTraveledKM: Number(distance.toFixed(2)),
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

  /* ---------------- UI ---------------- */
  const totalKm =
    startCoords && endCoords
      ? getDistanceKm(
          startCoords.latitude,
          startCoords.longitude,
          endCoords.latitude,
          endCoords.longitude
        ).toFixed(2)
      : "0.00";

  return (
    <ScrollView style={{ padding: 16 }}>
      {/* TRANSPORTATION PLANNED */}
      {isTransportation && (
        <>
          
          <Text style={styles.label}>Pickup Address</Text>
          <TextInput style={styles.input} value={planned.pickupLocation || ""} editable={false} />

          <Text style={{ marginTop: 4, fontSize: 12 }}>
            Scheduled At: {planned.pickupTime || "--"}
            </Text>

            <Text style={{ fontSize: 12 }}>
            Done At: {planned.pickupDoneAt || "Pending"}
            </Text>


          <Text style={styles.label}>Drop Address</Text>
          <TextInput style={styles.input} value={planned.dropLocation || ""} editable={false} />

          <Text style={{ marginTop: 4, fontSize: 12 }}>
            Scheduled At: {planned.dropTime || "--"}
            </Text>

            <Text style={{ fontSize: 12 }}>
            Done At: {planned.dropDoneAt || "Pending"}
        </Text>


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

            <Text style={styles.label}>Total Kilometers</Text>
                <TextInput
                style={styles.input}
                value={`${totalKm} km`}
                editable={false}
                />

                <Text style={styles.label}>Kilometers Traveled by Staff</Text>
                <TextInput
                style={styles.input}
                value={`${distance.toFixed(2)} km`}
                editable={false}
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

          {/* ---------- TRAVEL COMMENTS ---------- */}
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



          {!showExtraTransport && (
            <Pressable
              style={styles.addBtn}
              onPress={() => setShowExtraTransport(true)}
            >
              <Text>Add Extra Transportation</Text>
            </Pressable>
          )}
        </>
      )}

      {/* EXTRA TRANSPORT */}
      {showExtraTransport && (
        <>
        {isTransportation && <Pressable
    onPress={() => setShowExtraTransport(false)}
    style={{
      alignSelf: "flex-end",
      padding: 6,
      marginBottom: 6,
    }}
  >
    <Text style={{ fontSize: 18, color: "#DC2626" }}>✕</Text>
  </Pressable>}
          <Pressable
            onPress={isDriving ? endDrive : startDrive}
            style={[
              styles.driveBtn,
              { backgroundColor: isDriving ? "#DC2626" : "#14532D" },
            ]}
          >
            <Text style={styles.driveText}>
              {isDriving ? "End Drive" : "Start Drive"}
            </Text>
          </Pressable>

          <Text style={styles.label}>Starting Point</Text>
          <TextInput style={styles.input} value={startPoint} editable={false} />

          <Text style={styles.label}>Ending Point</Text>
          <TextInput style={styles.input} value={endPoint} editable={false} />

          <Text style={styles.label}>Total Distance</Text>
          <TextInput style={styles.input} value={`${totalKm} km`} editable={false} />

          <Text style={styles.label}>Staff KM</Text>
          <TextInput
            style={styles.input}
            value={`${distance.toFixed(2)} km`}
            editable={false}
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

          {/* ---------- TRAVEL COMMENTS ---------- */}
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
        </>
      )}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  label: { marginTop: 12, fontWeight: "600" },
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
  addBtn: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
  },
  driveBtn: {
    padding: 14,
    borderRadius: 6,
    marginVertical: 16,
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
