import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import CommonHeader from "../../components/CommonHeader";
import { useCampaigns } from "../../data/CampaignContext";

const C = {
  purple: "#5046E5",
  navy: "#11182B",
  body: "#596A83",
  muted: "#71829B",
  border: "#E4EAF2",
  pale: "#F5F8FC",
  white: "#FFFFFF",
};

type Campaign = {
  id: string;
  category: string;
  title: string;
  creator: string;
  description: string;
  raised: number;
  goal: number;
  daysLeft: number;
  icon: keyof typeof Ionicons.glyphMap;
  image: string;
};

const money = (amount: number) => "$" + amount.toLocaleString("en-US");

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress =
    campaign.goal > 0
      ? Math.min((campaign.raised / campaign.goal) * 100, 100)
      : 0;

  return (
    <View style={styles.campaignCard}>
      <ImageBackground
        source={{ uri: campaign.image }}
        style={styles.campaignImage}
        imageStyle={styles.campaignImageStyle}
      >
        <View style={styles.imageShade} />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{campaign.category}</Text>
        </View>
        <Text numberOfLines={3} style={styles.imageTitle}>
          {campaign.title}
        </Text>
      </ImageBackground>

      <View style={styles.campaignContent}>
        <Text style={styles.creatorText}>by {campaign.creator}</Text>
        <Text numberOfLines={3} style={styles.campaignDescription}>
          {campaign.description}
        </Text>
        <View style={styles.fundingHeader}>
          <Text style={styles.raisedAmount}>{money(campaign.raised)}</Text>
          <Text style={styles.goalText}>of {money(campaign.goal)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.reachText}>
          ≈ {Math.round(progress * 270)} people reached at goal
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/campaign/[id]",
              params: { id: campaign.id },
            })
          }
        >
          <Text style={styles.backButtonText}>Back this campaign</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { campaigns } = useCampaigns();
  const { width } = useWindowDimensions();
  const compact = width < 380;

  const go = (path: "/" | "/explore" | "/create" | "/profile") => {
    if (path === "/") return;
    router.push(path);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <CommonHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero image and text are separate, like the reference site. */}
        <View style={styles.heroSection}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=85",
            }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={styles.heroImageShade} />
            <View style={styles.heroLogo}>
              <Ionicons name="radio-outline" size={25} color={C.purple} />
              <Text style={styles.heroLogoText}>Campaigns</Text>
            </View>
          </ImageBackground>

          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            Deliver messages beyond your feed.
          </Text>
          <Text style={styles.heroDescription}>
            With Campaigns's community-powered media platform, you can share
            messages you care about with specific people, even with limited
            time, budget and network.
          </Text>

          <View style={styles.impactBox}>
            <Ionicons name="megaphone-outline" size={22} color={C.purple} />
            <Text style={styles.impactText}>
              $1 puts a message in front of about 27 people outside of your
              network.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => go("/explore")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Explore campaigns</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => go("/create")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Start a campaign</Text>
          </TouchableOpacity>
        </View>

        {/* Campaigns */}
        <View style={styles.campaignSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Explore Campaigns</Text>
            <TouchableOpacity onPress={() => go("/explore")}>
              <Text style={styles.sectionAction}>View all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.campaignRail}
          >
            {campaigns.map((campaign) => (
              <View key={campaign.id} style={styles.railCard}>
                <CampaignCard campaign={campaign} />
              </View>
            ))}
          </ScrollView>
          <Text style={styles.createPrompt}>
            Inspired by these?{" "}
            <Text style={styles.createPromptLink} onPress={() => go("/create")}>
              Create your own campaign.
            </Text>
          </Text>
        </View>

        {/* Backers and creators */}
        <View style={styles.audienceSection}>
          <View style={styles.audienceCard}>
            <Text style={styles.audienceBadge}>BACKERS</Text>
            <Text style={styles.audienceText}>
              For anyone who wants a message to travel further than their own
              feed. No account needed. Name private by default.
            </Text>
            <TouchableOpacity
              style={styles.audienceButton}
              onPress={() => go("/explore")}
            >
              <Text style={styles.audienceButtonText}>Back a campaign</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.audienceCard}>
            <Text style={styles.audienceBadge}>CREATORS</Text>
            <Text style={styles.audienceText}>
              For nonprofits, entrepreneurs, community groups, and more. We
              review and set up the distribution. Backers fund the reach.
            </Text>
            <TouchableOpacity
              style={styles.audienceButton}
              onPress={() => go("/create")}
            >
              <Text style={styles.audienceButtonText}>Start a campaign</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.howSection}>
          <Text style={styles.eyebrow}>HOW CAMPAIGNS WORK</Text>
          <Text style={styles.howTitle}>Create. Review. Amplify.</Text>
          <View style={styles.howRow}>
            <View style={styles.howItem}>
              <Ionicons name="create-outline" size={24} color={C.purple} />
              <Text style={styles.howItemTitle}>Create</Text>
              <Text style={styles.howItemText}>
                Write the message, add your sources, and set who you want to
                reach.
              </Text>
            </View>
            <View style={styles.howItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={C.purple}
              />
              <Text style={styles.howItemTitle}>Review</Text>
              <Text style={styles.howItemText}>
                We review campaigns to help keep distribution clear and
                trustworthy.
              </Text>
            </View>
            <View style={styles.howItem}>
              <Ionicons name="megaphone-outline" size={24} color={C.purple} />
              <Text style={styles.howItemTitle}>Amplify</Text>
              <Text style={styles.howItemText}>
                Backers help messages reach people beyond their existing
                networks.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.whySection}>
          <Text style={styles.eyebrow}>THE FAIR QUESTION</Text>
          <Text style={styles.whyTitle}>
            Why back a message instead of donating directly?
          </Text>
          <Text style={styles.whyText}>
            A direct donation pays rent, staff and supplies, among other things.
            This pays for the message to reach people outside of your network,
            getting more potential supporters in the process.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => go("/explore")}
          >
            <Text style={styles.primaryButtonText}>Explore campaigns</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.brand}>
            <Ionicons name="radio-outline" size={27} color="#293247" />
            <Text style={styles.brandText}>Campaigns</Text>
          </View>
          <Text style={styles.footerTagline}>Reach beyond your feed.</Text>
          <Text style={styles.footerText}>
            Campaigns are paid for by Campaign Technologies, Inc.
          </Text>
          <Text style={styles.footerText}>
            © 2026 Campaign Technologies, Inc.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  header: {
    height: 64,
    paddingHorizontal: 22,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.65,
    color: C.navy,
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
  scrollContent: { paddingBottom: 34 },
  heroSection: { paddingHorizontal: 26, paddingTop: 28, paddingBottom: 30 },
  heroImage: {
    height: 164,
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7EAF0",
  },
  heroImageStyle: { borderRadius: 22, resizeMode: "cover" },
  heroImageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(242,244,248,0.45)",
  },
  heroLogo: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  heroLogoText: { fontSize: 22, fontWeight: "800", color: C.navy },
  heroTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -1.15,
    color: C.navy,
    marginTop: 31,
  },
  heroTitleCompact: { fontSize: 30, lineHeight: 34 },
  heroDescription: {
    fontSize: 17,
    lineHeight: 27,
    color: C.body,
    marginTop: 19,
  },
  impactBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#EEF0FF",
    marginTop: 20,
    marginBottom: 20,
  },
  impactText: {
    flex: 1,
    color: C.navy,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 53,
    borderRadius: 13,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: C.white, fontSize: 16, fontWeight: "800" },
  secondaryButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
    backgroundColor: C.white,
  },
  secondaryButtonText: { color: C.navy, fontSize: 16, fontWeight: "800" },
  campaignSection: {
    paddingTop: 30,
    paddingBottom: 32,
    backgroundColor: "#F7F9FC",
  },
  sectionHeading: {
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    color: C.navy,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  sectionAction: { color: C.purple, fontSize: 14, fontWeight: "800" },
  campaignRail: {
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 16,
  },
  railCard: { width: 280 },
  campaignCard: {
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 2,
  },
  campaignImage: {
    height: 205,
    justifyContent: "space-between",
    padding: 14,
    overflow: "hidden",
  },
  campaignImageStyle: { resizeMode: "cover" },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9,15,30,0.42)",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  categoryText: { color: C.navy, fontSize: 12, fontWeight: "800" },
  imageTitle: {
    color: C.white,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    marginBottom: 2,
  },
  campaignContent: { padding: 17 },
  creatorText: { color: C.muted, fontSize: 13 },
  campaignDescription: {
    color: C.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    minHeight: 60,
  },
  fundingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 9,
  },
  raisedAmount: { color: C.navy, fontSize: 16, fontWeight: "900" },
  goalText: { color: C.muted, fontSize: 13 },
  progressTrack: {
    height: 8,
    borderRadius: 20,
    backgroundColor: "#EAF0FF",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 20, backgroundColor: C.purple },
  reachText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    marginBottom: 13,
  },
  backButton: {
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: "#FFE58A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  backButtonText: { color: C.navy, fontSize: 14, fontWeight: "800" },
  createPrompt: {
    paddingHorizontal: 26,
    marginTop: 13,
    color: C.muted,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
  },
  createPromptLink: { color: C.purple, fontWeight: "900" },
  audienceSection: {
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 30,
    gap: 18,
  },
  audienceCard: { backgroundColor: C.navy, borderRadius: 25, padding: 26 },
  audienceBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    color: C.white,
    backgroundColor: "#343D50",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  audienceText: {
    color: "#DCE3F0",
    fontSize: 17,
    lineHeight: 27,
    marginTop: 18,
    marginBottom: 20,
  },
  audienceButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  audienceButtonText: { color: C.navy, fontSize: 15, fontWeight: "800" },
  howSection: {
    paddingHorizontal: 26,
    paddingTop: 36,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  eyebrow: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  howTitle: {
    color: C.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 10,
    marginBottom: 22,
  },
  howRow: { gap: 14 },
  howItem: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    backgroundColor: C.white,
  },
  howItemTitle: {
    color: C.navy,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 9,
  },
  howItemText: { color: C.body, fontSize: 15, lineHeight: 23, marginTop: 6 },
  whySection: {
    paddingHorizontal: 26,
    paddingVertical: 32,
    backgroundColor: C.pale,
  },
  whyTitle: {
    color: C.navy,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 10,
  },
  whyText: {
    color: C.body,
    fontSize: 16,
    lineHeight: 26,
    marginTop: 17,
    marginBottom: 22,
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  footerTagline: {
    color: C.navy,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  footerText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.28)",
    justifyContent: "flex-start",
  },
  menuPanel: {
    flex: 1,
    width: "100%",
    backgroundColor: C.white,
    paddingTop: 8,
  },
  menuHeader: {
    height: 64,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuItems: { paddingHorizontal: 23, paddingTop: 14, paddingBottom: 28 },
  menuItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  menuItemText: { flex: 1, color: C.navy, fontSize: 16, fontWeight: "600" },
  menuDivider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: 13,
    marginBottom: 16,
  },
  menuOutlineButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  menuOutlineText: { color: C.navy, fontSize: 14, fontWeight: "800" },
  menuSubscribe: { color: C.purple, fontSize: 14, fontWeight: "800" },
  menuCreateButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: C.purple,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 1,
  },
  menuCreateText: { color: C.white, fontSize: 14, fontWeight: "800" },
});
