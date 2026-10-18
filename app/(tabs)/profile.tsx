import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
import { useCampaigns } from "../../data/CampaignContext";
import type { Campaign } from "../../data/campaigns";
import { supabase } from "../../lib/supabase";

const COLORS = {
  primary: "#4F46E5",
  background: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  green: "#16A34A",
  red: "#DC2626",
  lightPrimary: "#EEF2FF",
  lightGreen: "#DCFCE7",
};

type ContributionRecord = {
  id: string;
  campaign_id: string;
  amount: number | string;
  created_at: string;
  campaign_title?: string;
};

type DatabaseCampaign = {
  id: string;
  title: string;
  category: string;
  creator: string;
  description: string;
  goal: number | string;
  raised: number | string;
  days_left: number;
  image: string;
  icon: string;
};

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { deleteCampaign } = useCampaigns();

  const [loggingOut, setLoggingOut] = useState(false);
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(true);

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Campaign Member";

  const email = user?.email || "No email available";
  const initial = fullName.trim().charAt(0).toUpperCase() || "C";
  const totalRaised = myCampaigns.reduce(
    (sum, campaign) => sum + campaign.raised,
    0,
  );
  const totalContributed = contributions.reduce(
    (sum, contribution) => sum + Number(contribution.amount),
    0,
  );

  const loadMyCampaigns = useCallback(async () => {
    if (!user) {
      setMyCampaigns([]);
      setContributions([]);
      setLoadingCampaigns(false);
      setLoadingContributions(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id, title, category, creator, description, goal, raised, days_left, image, icon",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as DatabaseCampaign[];

      const campaigns: Campaign[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        creator: row.creator,
        description: row.description,
        goal: Number(row.goal),
        raised: Number(row.raised),
        daysLeft: row.days_left,
        image: row.image,
        icon: row.icon as Campaign["icon"],
      }));

      setMyCampaigns(campaigns);

      // Load contributions made by this user.
      const { data: contributionData, error: contributionError } =
        await supabase
          .from("contributions")
          .select("id, campaign_id, amount, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (contributionError) {
        throw contributionError;
      }

      const contributionRows = (contributionData ?? []) as Omit<
        ContributionRecord,
        "campaign_title"
      >[];
      const campaignIds = [
        ...new Set(contributionRows.map((item) => item.campaign_id)),
      ];
      let titleById = new Map<string, string>();

      if (campaignIds.length > 0) {
        const { data: titleRows, error: titleError } = await supabase
          .from("campaigns")
          .select("id, title")
          .in("id", campaignIds);

        if (titleError) {
          throw titleError;
        }

        titleById = new Map(
          (titleRows ?? []).map(
            (row: { id: string; title: string }) =>
              [row.id, row.title] as [string, string],
          ),
        );
      }

      setContributions(
        contributionRows.map((item) => ({
          ...item,
          campaign_title:
            titleById.get(item.campaign_id) ?? "Campaign unavailable",
        })),
      );
    } catch (error) {
      console.error("Failed to load your campaigns:", error);

      showMessage(
        "Unable to load campaigns",
        error instanceof Error ? error.message : "Please try again later.",
      );
    } finally {
      setLoadingCampaigns(false);
      setLoadingContributions(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMyCampaigns();
  }, [loadMyCampaigns]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadMyCampaigns();
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to log out.";

      showMessage("Logout failed", message);
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmDelete(campaign: Campaign) {
    const message = `Are you sure you want to delete "${campaign.title}"? This action cannot be undone.`;

    // React Native Alert.alert does not reliably display confirmation dialogs on web.
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(message)) {
        void handleDelete(campaign);
      }
      return;
    }

    Alert.alert("Delete campaign?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void handleDelete(campaign);
        },
      },
    ]);
  }

  async function handleDelete(campaign: Campaign) {
    if (deletingId) return;

    setDeletingId(campaign.id);
    try {
      await deleteCampaign(campaign.id);

      setMyCampaigns((previous) =>
        previous.filter((item) => item.id !== campaign.id),
      );

      showMessage("Success", "Campaign deleted successfully.");
    } catch (error) {
      console.error("Campaign deletion failed:", error);

      showMessage(
        "Delete failed",
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the campaign.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openCampaign(campaignId: string) {
    router.push({
      pathname: "/campaign/[id]",
      params: { id: campaignId },
    });
  }

  function formatAmount(amount: number) {
    return `$${amount.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  }

  function getProgress(raised: number, goal: number) {
    if (goal <= 0) return 0;

    return Math.min(Math.max((raised / goal) * 100, 0), 100);
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <CommonHeader />
        <View style={styles.loginPageContent}>
          <View style={styles.loginCard}>
            <Ionicons
              name="lock-closed-outline"
              size={30}
              color={COLORS.primary}
            />
            <Text style={styles.loginTitle}>Login to access this page</Text>
            <Pressable onPress={() => router.push("/auth/login")}>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CommonHeader />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>My Profile</Text>

        <Text style={styles.subtitle}>
          Manage your account and campaign activity.
        </Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{email}</Text>

          <View style={styles.badge}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeText}>Account Active</Text>
          </View>
        </View>

        {/* Account information */}
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Authentication</Text>
              <Text style={styles.infoValue}>Supabase Auth</Text>
            </View>
          </View>
        </View>

        {/* Dashboard statistics */}
        <Text style={[styles.sectionTitle, styles.dashboardTitle]}>
          Your Impact
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="megaphone-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.statValue}>{myCampaigns.length}</Text>
            <Text style={styles.statLabel}>Campaigns created</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons
                name="trending-up-outline"
                size={20}
                color={COLORS.green}
              />
            </View>
            <Text style={styles.statValue}>{formatAmount(totalRaised)}</Text>
            <Text style={styles.statLabel}>Raised on your campaigns</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{contributions.length}</Text>
            <Text style={styles.statLabel}>Contributions made</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.green} />
            </View>
            <Text style={styles.statValue}>
              {formatAmount(totalContributed)}
            </Text>
            <Text style={styles.statLabel}>Total contributed</Text>
          </View>
        </View>

        {/* My campaigns */}
        <View style={styles.campaignHeadingRow}>
          <View style={styles.campaignHeadingContent}>
            <Text style={styles.sectionTitle}>My Campaigns</Text>
            <Text style={styles.sectionSubtitle}>
              Campaigns you have created.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{myCampaigns.length}</Text>
          </View>
        </View>

        {loadingCampaigns ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading your campaigns...</Text>
          </View>
        ) : myCampaigns.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="megaphone-outline"
                size={32}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No campaigns yet</Text>

            <Text style={styles.emptyDescription}>
              Create your first campaign and start making a difference.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/(tabs)/create")}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.createButtonText}>Create Campaign</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.campaignList}>
            {myCampaigns.map((campaign) => {
              const progress = getProgress(campaign.raised, campaign.goal);
              const isDeleting = deletingId === campaign.id;

              return (
                <View key={campaign.id} style={styles.campaignCard}>
                  <Pressable
                    onPress={() => openCampaign(campaign.id)}
                    style={({ pressed }) => [
                      styles.campaignMain,
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open campaign ${campaign.title}`}
                  >
                    <View style={styles.campaignTopRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {campaign.category}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={COLORS.muted}
                      />
                    </View>

                    <Text style={styles.campaignTitle}>{campaign.title}</Text>

                    <Text style={styles.campaignDescription} numberOfLines={2}>
                      {campaign.description}
                    </Text>

                    <View style={styles.amountRow}>
                      <Text style={styles.raisedAmount}>
                        {formatAmount(campaign.raised)}
                      </Text>

                      <Text style={styles.goalAmount}>
                        of {formatAmount(campaign.goal)}
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[styles.progressFill, { width: `${progress}%` }]}
                      />
                    </View>

                    <View style={styles.progressFooter}>
                      <Text style={styles.progressLabel}>
                        {progress.toFixed(0)}% funded
                      </Text>

                      <Text style={styles.daysLeft}>
                        {campaign.daysLeft} days left
                      </Text>
                    </View>
                  </Pressable>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>Your campaign</Text>

                    <Pressable
                      onPress={() => confirmDelete(campaign)}
                      disabled={Boolean(deletingId)}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.buttonPressed,
                        Boolean(deletingId) && styles.disabledButton,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete campaign ${campaign.title}`}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={COLORS.red} />
                      ) : (
                        <>
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={COLORS.red}
                          />
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* My contributions */}
        <View style={styles.contributionHeading}>
          <View style={styles.campaignHeadingContent}>
            <Text style={styles.sectionTitle}>My Contributions</Text>
            <Text style={styles.sectionSubtitle}>
              Your recent contribution history.
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{contributions.length}</Text>
          </View>
        </View>

        {loadingContributions ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading contributions...</Text>
          </View>
        ) : contributions.length === 0 ? (
          <View style={styles.historyEmptyCard}>
            <Ionicons name="heart-outline" size={25} color={COLORS.muted} />
            <Text style={styles.historyEmptyText}>
              You haven't made any contributions yet.
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/explore")}>
              <Text style={styles.historyLink}>Explore campaigns</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.contributionList}>
            {contributions.slice(0, 10).map((contribution) => (
              <View key={contribution.id} style={styles.contributionRow}>
                <View style={styles.contributionIcon}>
                  <Ionicons name="heart" size={17} color={COLORS.primary} />
                </View>
                <View style={styles.contributionDetails}>
                  <Text style={styles.contributionTitle} numberOfLines={1}>
                    {contribution.campaign_title}
                  </Text>
                  <Text style={styles.contributionDate}>
                    {new Date(contribution.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.contributionAmount}>
                  {formatAmount(Number(contribution.amount))}
                </Text>
              </View>
            ))}
            {contributions.length > 10 && (
              <Text style={styles.historyFootnote}>
                Showing the 10 most recent contributions.
              </Text>
            )}
          </View>
        )}

        {/* Impact message */}
        <View style={styles.messageCard}>
          <View style={styles.messageIcon}>
            <Ionicons name="heart" size={23} color={COLORS.primary} />
          </View>

          <Text style={styles.messageTitle}>Make an impact 💜</Text>

          <Text style={styles.messageText}>
            Every campaign begins with someone who cares. Keep supporting the
            causes that matter to you.
          </Text>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.buttonPressed,
            loggingOut && styles.disabledButton,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={COLORS.red} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={21} color={COLORS.red} />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.version}>CampaignAmplification · Account</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginPageContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 64,
  },
  loginCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  loginLink: {
    marginTop: 14,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  scrollArea: { flex: 1 },
  topHeader: {
    height: 64,
    paddingHorizontal: 22,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#11182B",
    letterSpacing: -0.5,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingHorizontal: 16,
  },
  menuPanel: {
    width: 270,
    maxWidth: "100%",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  menuItemText: { fontSize: 14, fontWeight: "600", color: "#293247" },
  container: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 36,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 21,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "800",
  },
  name: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  email: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 15,
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  badgeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },
  infoCard: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 13,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  dashboardTitle: {
    marginTop: 28,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "42%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 132,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  campaignHeadingRow: {
    marginTop: 30,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  campaignHeadingContent: {
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 5,
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 17,
    backgroundColor: COLORS.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  stateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  emptyDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  campaignList: {
    gap: 14,
  },
  campaignCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  campaignMain: {
    padding: 17,
  },
  campaignTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: COLORS.lightPrimary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  campaignTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  campaignDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 19,
    marginBottom: 10,
    gap: 5,
  },
  raisedAmount: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  goalAmount: {
    color: COLORS.muted,
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: "#E8EAF2",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  progressLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  daysLeft: {
    color: COLORS.muted,
    fontSize: 12,
  },
  cardFooter: {
    minHeight: 56,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardFooterText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
  },
  deleteButtonText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: "700",
  },
  contributionHeading: {
    marginTop: 30,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contributionList: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contributionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contributionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  contributionDetails: {
    flex: 1,
  },
  contributionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  contributionDate: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  contributionAmount: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: "800",
  },
  historyEmptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  historyEmptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
  },
  historyLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    paddingTop: 2,
  },
  historyFootnote: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },
  messageCard: {
    marginTop: 26,
    backgroundColor: COLORS.lightPrimary,
    borderRadius: 18,
    padding: 20,
  },
  messageIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  messageTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  messageText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 7,
  },
  logoutButton: {
    marginTop: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  logoutText: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: "700",
  },
  version: {
    color: COLORS.muted,
    textAlign: "center",
    fontSize: 11,
    marginTop: 22,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  cardPressed: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
