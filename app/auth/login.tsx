import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useAuth } from "../../data/AuthContext";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginAsAdmin, setLoginAsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);

      // Fetch the authenticated user and verify their trusted role.
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error("Unable to verify your account.");
      }

      // app_metadata must be assigned by a trusted server/admin.
      const role = user.app_metadata?.role;
      const isAdmin = role === "admin" || role === "reviewer";

      if (loginAsAdmin && !isAdmin) {
        await supabase.auth.signOut();

        Alert.alert(
          "Admin access denied",
          "This account is not authorized as an Admin/Reviewer.",
        );
        return;
      }

      if (loginAsAdmin && isAdmin) {
        router.replace("/admin" as any);
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to log in.";

      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>C</Text>
        </View>

        <Text style={styles.brand}>CampaignAmplification</Text>

        <Text style={styles.heading}>Welcome back</Text>

        <Text style={styles.subtitle}>
          Sign in to continue supporting the causes you believe in.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email address</Text>

          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />

          {/* Admin login checkbox */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setLoginAsAdmin((previous) => !previous)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: loginAsAdmin }}
          >
            <View
              style={[styles.checkbox, loginAsAdmin && styles.checkboxSelected]}
            >
              {loginAsAdmin && (
                <Ionicons name="checkmark" size={17} color="#FFFFFF" />
              )}
            </View>

            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxTitle}>
                Login as Admin / Reviewer
              </Text>
              <Text style={styles.checkboxSubtitle}>
                Authorized administrator access only
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>

            <Link href="/auth/signup" asChild>
              <Pressable>
                <Text style={styles.link}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <Text style={styles.bottomText}>
          Your next step can make a difference.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  brand: {
    textAlign: "center",
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 34,
  },
  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    paddingVertical: 4,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  checkboxTextContainer: {
    marginLeft: 11,
    flex: 1,
  },
  checkboxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  checkboxSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
  },
  link: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomText: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 13,
    color: "#94A3B8",
  },
});
