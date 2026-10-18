import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
import { useCampaigns } from "../../data/CampaignContext";

const amounts = [5, 10, 25, 50, 100];

export default function ContributeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { campaigns } = useCampaigns();
  const campaign = campaigns.find((item) => item.id === id);
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");

  const amount = customAmount.trim() ? Number(customAmount) : selectedAmount;
  const validAmount = Number.isFinite(amount) && amount >= 1 && amount <= 10000;

  // Keep the contribution page private until the visitor logs in.
  if (!user) {
    return (
      <View style={styles.screen}>
        <CommonHeader />

        <View style={styles.loginContent}>
          <View style={styles.loginCard}>
            <View style={styles.loginIcon}>
              <Ionicons name="lock-closed-outline" size={28} color="#4F46E5" />
            </View>
            <Text style={styles.loginTitle}>Login to access this page</Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              accessibilityRole="link"
              style={styles.loginButton}
            >
              <Text style={styles.loginLink}>Login</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Campaign not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const campaignId = campaign.id;

  function handleContinue() {
    if (!validAmount) {
      Alert.alert("Invalid amount", "Enter an amount between $1 and $10,000.");
      return;
    }

    router.push({
      pathname: "/campaign/confirmation",
      params: { id: campaignId, amount: String(amount) },
    });
  }

  return (
    <View style={styles.screen}>
      <CommonHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR SUPPORT MATTERS</Text>
        <Text style={styles.title}>Choose your contribution</Text>
        <Text style={styles.description}>
          Select an amount to support the distribution of this campaign&apos;s
          message.
        </Text>

        <View style={styles.campaignCard}>
          <Text style={styles.campaignLabel}>CAMPAIGN</Text>
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.creator}>By {campaign.creator}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select an amount</Text>
        <View style={styles.amountGrid}>
          {amounts.map((value) => {
            const active = selectedAmount === value && customAmount === "";
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.amountButton,
                  active && styles.activeAmountButton,
                ]}
                onPress={() => {
                  setSelectedAmount(value);
                  setCustomAmount("");
                }}
              >
                <Text
                  style={[styles.amountText, active && styles.activeAmountText]}
                >
                  ${value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Or enter a custom amount (USD)</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            value={customAmount}
            onChangeText={setCustomAmount}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Your contribution</Text>
          <Text style={styles.summaryAmount}>
            {validAmount ? `$${amount.toFixed(2)}` : "—"}
          </Text>
        </View>

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#4F46E5"
          />
          <Text style={styles.noticeText}>
            This is a demonstration flow. No payment will be collected.
            Contributions are intended to amplify campaign messages, not to
            serve as direct charitable donations.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !validAmount && styles.disabledButton]}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  content: {
    padding: 22,
    paddingBottom: 40,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#4F46E5",
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    marginTop: 10,
  },
  campaignCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  campaignLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#64748B",
  },
  campaignTitle: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  creator: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748B",
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amountButton: {
    minWidth: "17%",
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  activeAmountButton: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  amountText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  activeAmountText: {
    color: "#4F46E5",
  },
  label: {
    marginTop: 22,
    marginBottom: 9,
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  inputContainer: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  dollarSign: {
    fontSize: 17,
    fontWeight: "700",
    color: "#64748B",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
    color: "#0F172A",
  },
  summary: {
    marginTop: 22,
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  summaryAmount: {
    fontSize: 21,
    fontWeight: "900",
    color: "#4F46E5",
  },
  notice: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: "#475569",
  },
  continueButton: {
    marginTop: 24,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  disabledButton: {
    opacity: 0.55,
  },
  continueText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  backText: {
    marginTop: 12,
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "700",
  },
  loginContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loginCard: {
    width: "100%",
    maxWidth: 360,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  loginIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  loginButton: {
    marginTop: 22,
    minHeight: 46,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
