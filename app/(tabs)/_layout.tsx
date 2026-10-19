import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../data/AuthContext";
import { supabase } from "../../lib/supabase";

const PRIMARY = "#4F46E5";
const POLL_MS = 15000;

type Metrics = {
  barHeight: number;
  icon: number;
  label: number;
  create: number;
};

// Pick sizes from the real window size, so it reacts to rotation and split-screen.
function getMetrics(width: number, height: number): Metrics {
  const isTablet = Math.min(width, height) >= 600; // same idea as Android's sw600dp
  const isLandscapePhone = !isTablet && width > height;
  const isCompact = !isTablet && width < 360;

  if (isTablet) return { barHeight: 76, icon: 28, label: 13, create: 60 };
  if (isLandscapePhone)
    return { barHeight: 56, icon: 22, label: 10, create: 44 };
  if (isCompact) return { barHeight: 62, icon: 22, label: 10, create: 46 };
  return { barHeight: 68, icon: 24, label: 11, create: 52 };
}

export default function TabLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const m = getMetrics(width, height);

  const { user } = useAuth();
  const userId = user?.id;
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    let isActive = true;

    const loadUnreadCount = async () => {
      const { count, error } = await supabase
        .from("activity_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (!error && isActive) setUnreadCount(count ?? 0);
    };

    void loadUnreadCount();

    // Only poll while the app is in the foreground.
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void loadUnreadCount();
    }, POLL_MS);

    // Refresh immediately when the user comes back to the app.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadUnreadCount();
    });

    return () => {
      isActive = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [userId]);

  const createRaise = Math.round(m.create * 0.54); // how far the button floats above the bar

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#94A3B8",
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          height: m.barHeight + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          borderTopWidth: 1,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: m.label,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={m.icon} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass-outline" size={m.icon} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarAccessibilityLabel: "Create",
          tabBarIcon: () => (
            <View
              style={{
                width: m.create,
                height: m.create,
                borderRadius: m.create / 2,
                backgroundColor: PRIMARY,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -createRaise,
                borderWidth: 4,
                borderColor: "#FFFFFF",
                elevation: 8,
                shadowColor: PRIMARY,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}
            >
              <Ionicons name="add" size={m.icon + 4} color="#FFFFFF" />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: m.label,
            fontWeight: "600",
            marginTop: 2,
          },
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarAccessibilityLabel:
            unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity",
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : unreadCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "800",
          },
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="notifications-outline"
              size={m.icon}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={m.icon} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
