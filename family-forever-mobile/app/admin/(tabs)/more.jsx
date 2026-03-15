import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    StyleSheet,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function MoreScreen() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const load = async () => {
            const stored = await AsyncStorage.getItem("user");
            if (stored) setUser(JSON.parse(stored));
        };
        load();
    }, []);

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.removeItem("user");
                    router.replace("/login");
                },
            },
        ]);
    };

    const menuSections = [
        {
            title: "Management",
            items: [
                {
                    icon: "people",
                    label: "Manage Staff",
                    route: "/admin/staff",
                    color: "#2F6B4F",
                },
                {
                    icon: "business",
                    label: "Manage Agencies",
                    route: "/admin/agencies",
                    color: "#9D4EDD",
                },
                {
                    icon: "add-circle",
                    label: "Add Agency",
                    route: "/admin/add-agency",
                    color: "#4ECDC4",
                },
                {
                    icon: "person-add",
                    label: "Add Client",
                    route: "/admin/add-client",
                    color: "#FF9F1C",
                },
            ],
        },
        {
            title: "Intake",
            items: [
                {
                    icon: "document-text",
                    label: "Intake Forms",
                    route: "/admin/intake-forms",
                    color: "#2F6B4F",
                },
                {
                    icon: "people-circle",
                    label: "Intake Workers",
                    route: "/admin/intake-workers",
                    color: "#FF4D6D",
                },
                {
                    icon: "create",
                    label: "Add Intake Form",
                    route: "/admin/add-intake-form",
                    color: "#6B7280",
                },
            ],
        },
        {
            title: "Settings",
            items: [
                {
                    icon: "settings",
                    label: "App Settings",
                    route: "/admin/settings",
                    color: "#6B7280",
                },
            ],
        },
    ];

    return (
        <SafeAreaView style={st.safe}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={st.profileCard}>
                    <View style={st.profileAvatar}>
                        {user?.profilePhotoUrl ? (
                            <Image
                                source={{ uri: user.profilePhotoUrl }}
                                style={st.profileImg}
                            />
                        ) : (
                            <Ionicons name="person" size={32} color="#999" />
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={st.profileName}>
                            {user?.name || "Admin"}
                        </Text>
                        <Text style={st.profileRole}>
                            {user?.role || "Administrator"}
                        </Text>
                        <Text style={st.profileEmail}>
                            {user?.email || ""}
                        </Text>
                    </View>
                </View>

                {/* Menu Sections */}
                {menuSections.map((section, sIdx) => (
                    <View key={sIdx} style={{ marginBottom: 20 }}>
                        <Text style={st.sectionTitle}>{section.title}</Text>
                        <View style={st.menuCard}>
                            {section.items.map((item, iIdx) => (
                                <Pressable
                                    key={iIdx}
                                    style={[
                                        st.menuItem,
                                        iIdx < section.items.length - 1 && st.menuItemBorder,
                                    ]}
                                    onPress={() => router.push(item.route)}
                                >
                                    <View
                                        style={[st.menuIcon, { backgroundColor: item.color + "18" }]}
                                    >
                                        <Ionicons name={item.icon} size={20} color={item.color} />
                                    </View>
                                    <Text style={st.menuLabel}>{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout Button */}
                <Pressable style={st.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                    <Text style={st.logoutText}>Logout</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#F9F7F4",
    },

    // Profile
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        gap: 16,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    profileAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#e5e7eb",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    profileImg: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    profileName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },
    profileRole: {
        fontSize: 13,
        fontWeight: "600",
        color: "#2F6B4F",
        marginTop: 2,
    },
    profileEmail: {
        fontSize: 12,
        color: "#999",
        marginTop: 2,
    },

    // Sections
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#999",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
    },
    menuCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        color: "#333",
    },

    // Logout
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#FEE2E2",
        paddingVertical: 16,
        borderRadius: 14,
        marginTop: 8,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#DC2626",
    },
});
