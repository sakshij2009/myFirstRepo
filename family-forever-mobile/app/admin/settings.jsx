import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Screen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <Ionicons name="construct-outline" size={64} color="#ccc" />
        <Text style={styles.placeholder}>Coming Soon</Text>
        <Text style={styles.sub}>This screen will be converted from the Figma design</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F7F4" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  body: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  placeholder: { fontSize: 22, fontWeight: "700", color: "#999", marginTop: 16 },
  sub: { fontSize: 14, color: "#bbb", marginTop: 8, textAlign: "center" },
});
