import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
import { useCampaigns } from "../../data/CampaignContext";
import { supabase } from "../../lib/supabase";

const PRIMARY = "#4F46E5";

type Contribution = {
  id: string;
  amount: number | string;
  created_at: string;
  user_id: string;
};

export default function CampaignDetailsScreen() {
  const { campaigns, isLoading, refreshCampaigns } = useCampaigns();
  const { user } = useAuth();

  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const campaignId = Array.isArray(id) ? id[0] : id;

  const campaign = campaigns.find((item) => item.id === campaignId);

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadContributions = useCallback(async () => {
    if (!campaignId || !campaign) {
      setContributions([]);
      setLoadingContributions(false);
      return;
    }

    // Built-in examples are not stored in the database.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(campaignId)) {
      setContributions([]);
      setLoadingContributions(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("contributions")
        .select("id, amount, created_at, user_id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      setContributions((data ?? []) as Contribution[]);
    } catch (error) {
      console.error("Failed to load campaign contributions:", error);

      Alert.alert(
        "Unable to load contributions",
        error instanceof Error ? error.message : "Please try again later.",
      );
    } finally {
      setLoadingContributions(false);
    }
  }, [campaignId, campaign]);

  useEffect(() => {
    void loadContributions();
  }, [loadContributions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await refreshCampaigns();
      await loadContributions();
    } finally {
      setRefreshing(false);
    }
  }, [refreshCampaigns, loadContributions]);

  if (isLoading && !campaign) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.stateText}>Loading campaign...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={46} color="#64748B" />

        <Text style={styles.missingTitle}>Campaign not found</Text>

        <Text style={styles.stateText}>
          This campaign may have been deleted or is no longer available.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/(tabs)/explore")}
        >
          <Text style={styles.primaryButtonText}>Explore Campaigns</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress =
    campaign.goal > 0
      ? Math.min(
          Math.max(Math.round((campaign.raised / campaign.goal) * 100), 0),
          100,
        )
      : 0;

  const remaining = Math.max(campaign.goal - campaign.raised, 0);

  const formatAmount = (amount: number) =>
    `$${amount.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const isDatabaseCampaign =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      campaign.id,
    );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <CommonHeader />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={23} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Campaign Details</Text>

        <TouchableOpacity
          onPress={() => void handleRefresh()}
          style={styles.iconButton}
          accessibilityLabel="Refresh campaign"
        >
          <Ionicons name="refresh-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
          />
        }
      >
        <ImageBackground
          source={campaign.image ? { uri: campaign.image } : undefined}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{campaign.category}</Text>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.title}>{campaign.title}</Text>

          <View style={styles.creatorRow}>
            <View style={styles.creatorAvatar}>
              <Ionicons name="person" size={17} color={PRIMARY} />
            </View>

            <View style={styles.creatorInfo}>
              <Text style={styles.creatorLabel}>Campaign created by</Text>
              <Text style={styles.creator}>{campaign.creator}</Text>
            </View>
          </View>

          {/* Funding statistics */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.muted}>Amount raised</Text>
                <Text style={styles.amount}>
                  {formatAmount(campaign.raised)}
                </Text>
              </View>

              <View style={styles.right}>
                <Text style={styles.muted}>Funding goal</Text>
                <Text style={styles.goal}>{formatAmount(campaign.goal)}</Text>
              </View>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.progressText}>{progress}% funded</Text>
              <Text style={styles.progressText}>
                {formatAmount(remaining)} remaining
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
                <Text style={styles.metricValue}>{campaign.daysLeft}</Text>
                <Text style={styles.metricLabel}>Days left</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metric}>
                <Ionicons name="people-outline" size={20} color={PRIMARY} />
                <Text style={styles.metricValue}>{contributions.length}</Text>
                <Text style={styles.metricLabel}>Recent contributions</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metric}>
                <Ionicons name="flag-outline" size={20} color={PRIMARY} />
                <Text style={styles.metricValue}>
                  {progress >= 100 ? "100%" : `${progress}%`}
                </Text>
                <Text style={styles.metricLabel}>Goal progress</Text>
              </View>
            </View>
          </View>

          {/* Campaign description */}
          <Text style={styles.sectionTitle}>About this campaign</Text>

          <Text style={styles.description}>{campaign.description}</Text>

          {/* Contribution history */}
          <View style={styles.historyHeading}>
            <Text style={styles.sectionTitle}>Recent Contributions</Text>

            <View style={styles.historyIcon}>
              <Ionicons name="heart-outline" size={19} color={PRIMARY} />
            </View>
          </View>

          {loadingContributions ? (
            <View style={styles.historyState}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.historyStateText}>
                Loading contributions...
              </Text>
            </View>
          ) : contributions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons
                name="heart-dislike-outline"
                size={29}
                color="#94A3B8"
              />

              <Text style={styles.emptyHistoryTitle}>No contributions yet</Text>

              <Text style={styles.emptyHistoryText}>
                Be among the first to support this campaign.
              </Text>
            </View>
          ) : (
            <View style={styles.historyCard}>
              {contributions.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <View style={styles.historyDivider} />}

                  <View style={styles.contributionRow}>
                    <View style={styles.contributionAvatar}>
                      <Ionicons name="heart" size={17} color={PRIMARY} />
                    </View>

                    <View style={styles.contributionInfo}>
                      <Text style={styles.contributionName}>
                        {user?.id === item.user_id
                          ? "You contributed"
                          : "Campaign supporter"}
                      </Text>

                      <Text style={styles.contributionDate}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>

                    <Text style={styles.contributionAmount}>
                      {formatAmount(Number(item.amount))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={PRIMARY}
            />

            <Text style={styles.noticeText}>
              Contributions support the distribution and amplification of
              campaign messages. They are not direct donations to the causes
              described.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/campaign/contribute",
                params: { id: campaign.id },
              })
            }
          >
            <Text style={styles.primaryButtonText}>Amplify this Campaign</Text>

            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {!isDatabaseCampaign && (
            <Text style={styles.demoNotice}>
              This is a sample campaign. Contributions are available for
              campaigns stored in the database.
            </Text>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/(tabs)/explore")}
          >
            <Text style={styles.secondaryButtonText}>
              Explore other campaigns
            </Text>
          </TouchableOpacity>
        </View>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },
  stateText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
  },
  missingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 15,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  image: {
    height: 260,
    justifyContent: "flex-start",
    padding: 18,
    backgroundColor: "#CBD5E1",
  },
  imageStyle: {
    resizeMode: "cover",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY,
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.6,
    color: "#0F172A",
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    gap: 11,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  creatorInfo: {
    flex: 1,
  },
  creatorLabel: {
    color: "#64748B",
    fontSize: 11,
  },
  creator: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  statsCard: {
    marginTop: 23,
    padding: 18,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  right: {
    alignItems: "flex-end",
  },
  muted: {
    fontSize: 12,
    color: "#64748B",
  },
  amount: {
    fontSize: 24,
    fontWeight: "900",
    color: PRIMARY,
    marginTop: 5,
  },
  goal: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 7,
  },
  track: {
    height: 9,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginTop: 17,
    marginBottom: 10,
  },
  fill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 20,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    height: 48,
    backgroundColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 28,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 25,
    color: "#475569",
  },
  historyHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  historyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 25,
    alignItems: "center",
  },
  historyStateText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
  },
  emptyHistory: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 25,
    alignItems: "center",
  },
  emptyHistoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  emptyHistoryText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#64748B",
    textAlign: "center",
    marginTop: 5,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 15,
  },
  historyDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  contributionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  contributionAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  contributionInfo: {
    flex: 1,
  },
  contributionName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  contributionDate: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  contributionAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 15,
    marginTop: 23,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: "#334155",
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 25,
    paddingHorizontal: 15,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 14,
  },
  demoNotice: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
});
