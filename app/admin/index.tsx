import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
const adminSections = [
  {
    title: "Review Campaigns",
    description: "Review campaign content and creative assets",
    icon: "clipboard-outline" as const,
    color: "#4F46E5",
  },
  {
    title: "Pending Approvals",
    description: "Campaigns awaiting administrator review",
    icon: "time-outline" as const,
    color: "#D97706",
  },
  {
    title: "Approved Campaigns",
    description: "View eligible campaigns",
    icon: "checkmark-circle-outline" as const,
    color: "#059669",
  },
  {
    title: "Rejected Campaigns",
    description: "View campaigns that were rejected",
    icon: "close-circle-outline" as const,
    color: "#DC2626",
  },
  {
    title: "Distribution Management",
    description: "Prepare and manage message distribution",
    icon: "megaphone-outline" as const,
    color: "#7C3AED",
  },
  {
    title: "Reports & Moderation",
    description: "Monitor reporting and moderation activity",
    icon: "shield-checkmark-outline" as const,
    color: "#0891B2",
  },
];

export default function AdminDashboard() {
  const { signOut, user } = useAuth();

  async function handleLogout() {
    try {
      await signOut();
      router.replace("/auth/login");
    } catch {
      Alert.alert("Error", "Unable to log out. Please try again.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CAMPAIGN AMPLIFICATION</Text>
          <Text style={styles.heading}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Platform administration</Text>
        </View>

        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={21} color="#4F46E5" />
        </Pressable>
      </View> */}
      <CommonHeader />
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#11182B" }}>
          Admin Dashboard
        </Text>
        <Text style={{ fontSize: 14, color: "#596A83", marginTop: 5 }}>
          Manage and review campaigns
        </Text>
      </View>
      <View style={styles.welcomeCard}>
        <View style={styles.adminIcon}>
          <Ionicons name="shield-checkmark" size={27} color="#FFFFFF" />
        </View>

        <View style={styles.welcomeText}>
          <Text style={styles.welcomeTitle}>Welcome, Administrator</Text>
          <Text style={styles.welcomeDescription}>
            Review campaigns and manage platform distribution.
          </Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Administration</Text>

      {adminSections.map((section) => (
        <Pressable
          key={section.title}
          style={({ pressed }) => [
            styles.sectionCard,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            Alert.alert(
              section.title,
              "This section's functionality will be connected next.",
            )
          }
        >
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: `${section.color}15` },
            ]}
          >
            <Ionicons name={section.icon} size={24} color={section.color} />
          </View>

          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#4F46E5",
    marginBottom: 7,
  },
  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4338CA",
    padding: 18,
    borderRadius: 20,
    marginBottom: 28,
  },
  adminIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  welcomeText: {
    flex: 1,
    marginLeft: 14,
  },
  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  welcomeDescription: {
    color: "#E0E7FF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  email: {
    color: "#C7D2FE",
    fontSize: 11,
    marginTop: 7,
  },
  sectionHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 15,
  },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionText: {
    flex: 1,
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
});
