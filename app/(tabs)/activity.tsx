import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
import { useCampaigns } from "../../data/CampaignContext";
import { supabase } from "../../lib/supabase";

const COLORS = {
  primary: "#4F46E5",
  background: "#F8FAFC",
  white: "#FFFFFF",
  heading: "#0F172A",
  text: "#475569",
  muted: "#64748B",
  border: "#E2E8F0",
  green: "#16A34A",
  greenBackground: "#DCFCE7",
  purpleBackground: "#EEF2FF",
  unreadBackground: "#F5F3FF",
  red: "#DC2626",
};

type ActivityNotification = {
  id: string;
  user_id: string;
  campaign_id: string | null;
  type: "campaign_created" | "contribution_made" | "campaign_supported";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function formatTimeAgo(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recently";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function getNotificationIcon(
  type: ActivityNotification["type"],
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "campaign_created":
      return "megaphone-outline";
    case "contribution_made":
      return "heart-outline";
    case "campaign_supported":
      return "people-outline";
    default:
      return "notifications-outline";
  }
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ActivityScreen() {
  const { user } = useAuth();
  const { campaigns } = useCampaigns();
  const [notifications, setNotifications] = useState<ActivityNotification[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const loadNotifications = useCallback(
    async (showSpinner = true) => {
      if (!user) {
        setNotifications([]);
        setLoadError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (showSpinner) setIsLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("activity_notifications")
        .select(
          "id, user_id, campaign_id, type, title, message, is_read, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setLoadError(error.message);
        setNotifications([]);
      } else {
        setNotifications((data ?? []) as ActivityNotification[]);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotifications(false);
  }, [loadNotifications]);

  const markAsRead = useCallback(
    async (notification: ActivityNotification) => {
      if (notification.is_read || updatingIds.includes(notification.id)) return;

      setUpdatingIds((current) => [...current, notification.id]);

      const { error } = await supabase
        .from("activity_notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", user?.id ?? "");

      setUpdatingIds((current) =>
        current.filter((id) => id !== notification.id),
      );

      if (error) {
        showMessage("Couldn't update notification", error.message);
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );
    },
    [updatingIds, user],
  );

  const openNotification = useCallback(
    async (notification: ActivityNotification) => {
      await markAsRead(notification);

      if (notification.campaign_id) {
        router.push({
          pathname: "/campaign/[id]",
          params: { id: notification.campaign_id },
        });
      }
    },
    [markAsRead],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("activity_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      showMessage("Couldn't update notifications", error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    );
  }, [notifications, user]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const recentCampaigns = [...campaigns].slice(0, 4);

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
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CommonHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.activityPageHeading}>
          <Text style={styles.eyebrow}>YOUR COMMUNITY</Text>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSubtitle}>
            Updates about campaigns and your support.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Your notifications</Text>
            <Text style={styles.summaryDescription}>
              {unreadCount === 0
                ? "You're all caught up."
                : `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"} waiting for you.`}
            </Text>
          </View>
          <Text style={styles.summaryCount}>{notifications.length}</Text>
        </View>

        {notifications.length > 0 && unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={17}
              color={COLORS.primary}
            />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent updates</Text>
          <Text style={styles.sectionCaption}>Latest first</Text>
        </View>

        {!user ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={28}
                color={COLORS.muted}
              />
            </View>
            <Text style={styles.emptyTitle}>Log in to see your activity</Text>
            <Text style={styles.emptyDescription}>
              Your notifications will be available here when you're signed in.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Log in</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading your activity…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={27}
              color={COLORS.red}
            />
            <Text style={styles.emptyTitle}>Couldn't load notifications</Text>
            <Text style={styles.emptyDescription}>{loadError}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void loadNotifications()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length > 0 ? (
          <View style={styles.notificationList}>
            {notifications.map((notification) => {
              const hasCampaign = Boolean(notification.campaign_id);
              const isUpdating = updatingIds.includes(notification.id);

              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.is_read && styles.notificationUnread,
                  ]}
                  activeOpacity={0.82}
                  onPress={() => void openNotification(notification)}
                  onLongPress={() => void markAsRead(notification)}
                  disabled={isUpdating}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      !notification.is_read && styles.notificationIconUnread,
                    ]}
                  >
                    <Ionicons
                      name={getNotificationIcon(notification.type)}
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={styles.notificationBody}>
                    <View style={styles.notificationTopRow}>
                      <Text style={styles.notificationTitle} numberOfLines={2}>
                        {notification.title}
                      </Text>
                      {!notification.is_read && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <View style={styles.notificationFooter}>
                      <Text style={styles.timestamp}>
                        {formatTimeAgo(notification.created_at)}
                      </Text>
                      {hasCampaign && (
                        <Text style={styles.viewCampaignText}>
                          View campaign ›
                        </Text>
                      )}
                      {isUpdating && (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-off-outline"
                size={30}
                color={COLORS.muted}
              />
            </View>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptyDescription}>
              New campaign and contribution notifications will appear here when
              activity tracking is connected.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discover campaigns</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentCampaigns.length > 0 ? (
          <View style={styles.campaignList}>
            {recentCampaigns.map((campaign) => (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                activeOpacity={0.82}
                onPress={() =>
                  router.push({
                    pathname: "/campaign/[id]",
                    params: { id: campaign.id },
                  })
                }
              >
                <View style={styles.campaignIcon}>
                  <Ionicons
                    name={
                      (campaign.icon ||
                        "megaphone-outline") as keyof typeof Ionicons.glyphMap
                    }
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.campaignCopy}>
                  <Text style={styles.campaignTitle} numberOfLines={1}>
                    {campaign.title}
                  </Text>
                  <Text style={styles.campaignMeta} numberOfLines={1}>
                    {campaign.category} · Goal $
                    {Number(campaign.goal).toLocaleString("en-US")}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
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
    color: COLORS.heading,
    textAlign: "center",
  },
  loginLink: {
    marginTop: 14,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  header: {
    height: 64,
    paddingHorizontal: 22,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
    borderColor: "#E4EAF2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 76,
    paddingHorizontal: 12,
  },
  menuPanel: {
    width: "100%",
    maxWidth: 340,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E4EAF2",
  },
  menuHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  menuTitle: { fontSize: 18, fontWeight: "800", color: "#11182B" },
  menuCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItem: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuItemText: { fontSize: 14, fontWeight: "700", color: "#293247" },
  activityPageHeading: { marginBottom: 20 },

  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: COLORS.primary,
  },
  headerTitle: {
    marginTop: 5,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.7,
    color: COLORS.heading,
  },
  headerSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleBackground,
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "900",
  },
  content: { padding: 18, paddingBottom: 36 },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.purpleBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: { flex: 1 },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: COLORS.heading },
  summaryDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.muted,
  },
  summaryCount: { fontSize: 23, fontWeight: "900", color: COLORS.primary },
  markAllButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  markAllText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  sectionHeader: {
    marginTop: 26,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: COLORS.heading },
  sectionCaption: { fontSize: 12, color: COLORS.muted },
  seeAllText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  notificationList: { gap: 10 },
  notificationCard: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notificationUnread: {
    backgroundColor: COLORS.unreadBackground,
    borderColor: "#C7D2FE",
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationIconUnread: { backgroundColor: "#E0E7FF" },
  notificationBody: { flex: 1, minWidth: 0 },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: COLORS.heading,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 5,
  },
  notificationMessage: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.text,
  },
  notificationFooter: {
    marginTop: 11,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  timestamp: { fontSize: 11, color: COLORS.muted },
  viewCampaignText: { fontSize: 11, fontWeight: "800", color: COLORS.primary },
  emptyCard: {
    padding: 25,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  emptyTitle: {
    marginTop: 15,
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.heading,
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    minHeight: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 13, fontWeight: "800" },
  stateCard: {
    padding: 28,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateText: { fontSize: 13, color: COLORS.muted },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  campaignList: { gap: 10 },
  campaignCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  campaignIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.purpleBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  campaignCopy: { flex: 1, minWidth: 0 },
  campaignTitle: { fontSize: 13, fontWeight: "800", color: COLORS.heading },
  campaignMeta: { marginTop: 4, fontSize: 11, color: COLORS.muted },
});
