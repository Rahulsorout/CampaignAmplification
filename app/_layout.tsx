import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthProvider, useAuth } from "../data/AuthContext";
import { CampaignProvider } from "../data/CampaignContext";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const currentRoute = segments[1];

    // Logged-in users should not remain on login/signup screens.
    if (user && inAuthGroup && currentRoute === "signup") {
      router.replace("/(tabs)");
      return;
    }

    // Logged-out users can browse public pages.
    // Only keep them on valid authentication screens when inside /auth.
    if (!user && inAuthGroup) {
      if (currentRoute !== "login" && currentRoute !== "signup") {
        router.replace("/auth/login");
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CampaignProvider>
        <RootNavigator />
      </CampaignProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
});
