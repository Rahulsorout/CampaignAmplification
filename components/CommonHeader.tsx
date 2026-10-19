import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../data/AuthContext";

const C = {
  purple: "#5046E5",
  navy: "#11182B",
  body: "#596A83",
  muted: "#71829B",
  border: "#E4EAF2",
  white: "#FFFFFF",
  background: "#F3F6FC",
};

type CommonHeaderProps = {
  title?: string;
  showMenu?: boolean;
};

export function Brand() {
  return (
    <View style={styles.brand}>
      <Ionicons name="radio-outline" size={27} color="#293247" />
      <Text style={styles.brandText}>Campaigns</Text>
    </View>
  );
}

export default function CommonHeader({
  title,
  showMenu = true,
}: CommonHeaderProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [partnersExpanded, setPartnersExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    setMenuVisible(false);

    try {
      await signOut();
      router.replace("/auth/login");
    } catch {
      Alert.alert("Logout failed", "Please try again.");
    }
  };

  const go = (
    path: "/(tabs)" | "/(tabs)/explore" | "/(tabs)/profile" | "/(tabs)/create",
  ) => {
    setMenuVisible(false);
    router.push(path);
  };

  return (
    <>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          onPress={() => go("/(tabs)")}
        >
          <Brand />
        </TouchableOpacity>

        {title ? <Text style={styles.pageTitle}>{title}</Text> : null}

        {showMenu ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.75}
            style={styles.menuButton}
          >
            <Ionicons name="menu-outline" size={26} color={C.navy} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuVisible(false)}
      >
        <View
          style={[
            styles.modalBackdrop,
            {
              paddingTop: Math.max(insets.top, 6),
              paddingBottom: Math.max(insets.bottom, 6),
            },
          ]}
        >
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <Brand />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMenuVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
              >
                <Ionicons name="close-outline" size={27} color={C.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={styles.menuContent}
            >
              <MenuItem
                icon="home-outline"
                label="Home"
                onPress={() => go("/(tabs)")}
              />

              <MenuItem
                icon="compass-outline"
                label="Explore Campaigns"
                onPress={() => go("/(tabs)/explore")}
              />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => setPartnersExpanded((value) => !value)}
              >
                <Ionicons name="people-outline" size={20} color={C.navy} />
                <Text style={styles.menuItemText}>Partners</Text>
                <Ionicons
                  name={partnersExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={C.navy}
                />
              </TouchableOpacity>

              {partnersExpanded ? (
                <View style={styles.submenu}>
                  <Text style={styles.submenuText}>Partner information</Text>
                </View>
              ) : null}

              <MenuItem
                icon="settings-outline"
                label="How It Works"
                onPress={() => {}}
              />

              <MenuItem
                icon="megaphone-outline"
                label="Why Fund A Campaign"
                onPress={() => {}}
              />

              <MenuItem
                icon="sparkles-outline"
                label="How You Make Impact"
                onPress={() => {}}
              />

              <MenuItem
                icon="help-circle-outline"
                label="FAQ"
                onPress={() => {}}
              />

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => {}}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => go("/(tabs)/profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineButtonText}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={16} color="#DC2626" />
                <Text style={[styles.outlineButtonText, { color: "#DC2626" }]}>
                  Logout
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => {}}
                activeOpacity={0.8}
              >
                <Ionicons name="mail" size={14} color={C.purple} />
                <Text style={styles.subscribeText}>Subscribe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createButton}
                onPress={() => go("/(tabs)/create")}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={19} color={C.white} />
                <Text style={styles.createButtonText}>Create a Campaign</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={C.navy} />
      <Text style={styles.menuItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    paddingHorizontal: 22,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  brandText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.65,
    color: C.navy,
  },

  pageTitle: {
    flex: 1,
    marginLeft: 16,
    color: C.navy,
    fontSize: 18,
    fontWeight: "800",
  },

  menuButton: {
    height: 42,
    width: 42,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(226,233,245,0.62)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  menuPanel: {
    width: "100%",
    maxWidth: 340,
    maxHeight: "98%",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#D9E0EB",
    borderRadius: 12,
    overflow: "hidden",
  },

  menuHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F7",
  },

  closeButton: {
    height: 42,
    width: 42,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  menuContent: {
    paddingHorizontal: 17,
    paddingTop: 13,
    paddingBottom: 27,
  },

  menuItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  menuItemText: {
    flex: 1,
    color: C.navy,
    fontSize: 16,
    fontWeight: "600",
  },

  submenu: {
    paddingLeft: 36,
    paddingVertical: 8,
  },

  submenuText: {
    color: C.body,
    fontSize: 13,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "#EDF1F7",
    marginTop: 12,
    marginBottom: 16,
    marginHorizontal: 7,
  },

  outlineButton: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 9,
  },

  outlineButtonText: {
    color: C.navy,
    fontSize: 14,
    fontWeight: "800",
  },

  subscribeText: {
    color: C.purple,
    fontSize: 14,
    fontWeight: "800",
  },

  createButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: C.purple,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 1,
  },

  createButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
