import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
import { useCampaigns } from "../../data/CampaignContext";

const COLORS = {
  primary: "#4F46E5",
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  green: "#16A34A",
  lightPrimary: "#EEF2FF",
  lightGreen: "#DCFCE7",
  red: "#DC2626",
};

type ContributionResult = {
  success: boolean;
  contribution_id: string;
  campaign_id: string;
  amount: number;
  total_raised: number;
};

export default function ConfirmationScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    amount?: string | string[];
  }>();

  const { user } = useAuth();
  const { campaigns, refreshCampaigns } = useCampaigns();

  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id;
  const amountParam = Array.isArray(params.amount)
    ? params.amount[0]
    : params.amount;

  const parsedAmount = Number(amountParam);

  const campaign = campaigns.find((item) => item.id === campaignId);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [totalRaised, setTotalRaised] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const validAmount =
    amountParam !== undefined &&
    amountParam.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 1 &&
    parsedAmount <= 10000;

  async function handleContribution() {
    if (isSaving || saved) {
      return;
    }

    setErrorMessage("");

    if (!user) {
      setErrorMessage("Please log in before making a contribution.");
      return;
    }

    if (!campaignId || !campaign) {
      setErrorMessage(
        "This campaign could not be found. Please return to Explore and try again.",
      );
      return;
    }

    if (!validAmount) {
      setErrorMessage("Enter a valid contribution between $1 and $10,000.");
      return;
    }

    // Built-in example campaigns use IDs such as "1" and "2".
    // Only UUIDs correspond to campaigns stored in Supabase.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(campaignId)) {
      setErrorMessage(
        "Demo campaigns cannot receive contributions. Please select a campaign created in the app.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "record_campaign_contribution",
        {
          p_campaign_id: campaignId,
          p_amount: parsedAmount,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = data as ContributionResult;

      if (
        !result ||
        result.success !== true ||
        result.campaign_id !== campaignId
      ) {
        throw new Error(
          "The contribution could not be verified. Please check your contribution history before trying again.",
        );
      }

      setTotalRaised(Number(result.total_raised));
      setSaved(true);

      // Refresh the shared campaign list so Home and Explore
      // can display the updated fundraising total.
      await refreshCampaigns();
    } catch (error) {
      console.error("Contribution failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to record your contribution. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function formatAmount(amount: number) {
    return `$${amount.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  }

  if (!campaign) {
    return (
      <View style={styles.screen}>
        <CommonHeader />
        <View style={styles.centered}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={COLORS.muted}
          />

          <Text style={styles.missingTitle}>Campaign not found</Text>

          <Text style={styles.missingText}>
            We couldn't find this campaign. Return to Explore and select another
            campaign.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace("/(tabs)/explore")}
          >
            <Text style={styles.primaryButtonText}>Back to Explore</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CommonHeader />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="heart" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.eyebrow}>CONTRIBUTION CONFIRMATION</Text>

          <Text style={styles.heading}>
            {saved
              ? "Thank you for contributing!"
              : "You're ready to make an impact!"}
          </Text>

          <Text style={styles.subtitle}>
            {saved
              ? "Your contribution has been recorded successfully."
              : "Review your contribution before recording it."}
          </Text>
        </View>

        <View style={styles.campaignCard}>
          <Text style={styles.cardLabel}>YOUR SELECTED CAMPAIGN</Text>

          <Text style={styles.campaignTitle}>{campaign.title}</Text>

          <Text style={styles.category}>{campaign.category}</Text>

          <View style={styles.divider} />

          <Text style={styles.amountLabel}>Contribution amount</Text>

          <Text style={styles.amount}>
            {validAmount ? formatAmount(parsedAmount) : "Invalid amount"}
          </Text>

          {saved && (
            <>
              <View style={styles.successBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.green}
                />
                <Text style={styles.successBadgeText}>
                  Contribution recorded
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.amountLabel}>Updated amount raised</Text>

              <Text style={styles.raisedAmount}>
                {totalRaised !== null
                  ? formatAmount(totalRaised)
                  : "Updated successfully"}
              </Text>
            </>
          )}
        </View>

        {!saved && (
          <View style={styles.noticeCard}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={COLORS.primary}
            />

            <Text style={styles.noticeText}>
              This records a contribution in the app database. It does not
              charge a payment method or transfer real money.
            </Text>
          </View>
        )}

        {!!errorMessage && (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color={COLORS.red}
            />

            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {!saved ? (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isSaving && styles.disabledButton,
            ]}
            onPress={handleContribution}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <ActivityIndicator color={COLORS.white} />
                <Text style={styles.primaryButtonText}>
                  Recording contribution...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="heart-outline" size={20} color={COLORS.white} />

                <Text style={styles.primaryButtonText}>
                  Record Contribution
                </Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={25} color={COLORS.green} />

            <Text style={styles.successTitle}>Contribution successful</Text>

            <Text style={styles.successText}>
              The campaign's fundraising total has been updated.
            </Text>
          </View>
        )}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </Pressable>

        <Pressable
          style={styles.exploreButton}
          onPress={() => router.replace("/(tabs)/explore")}
        >
          <Text style={styles.exploreButtonText}>Explore More Campaigns</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  header: {
    alignItems: "center",
    marginBottom: 25,
  },
  headerIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
    textAlign: "center",
  },
  heading: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },
  campaignCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  campaignTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 12,
    lineHeight: 28,
  },
  category: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  amountLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  amount: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 7,
  },
  raisedAmount: {
    color: COLORS.green,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 7,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    backgroundColor: COLORS.lightGreen,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 18,
  },
  successBadgeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "700",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: COLORS.lightPrimary,
    borderRadius: 14,
    padding: 15,
    marginTop: 18,
  },
  noticeText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 19,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    color: COLORS.red,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 18,
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  exploreButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  exploreButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  successCard: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 14,
    padding: 18,
    marginTop: 22,
    alignItems: "center",
  },
  successTitle: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  successText: {
    color: COLORS.text,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },
  missingTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  missingText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
