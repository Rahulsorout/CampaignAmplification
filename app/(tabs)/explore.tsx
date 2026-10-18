import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CommonHeader from "../../components/CommonHeader";
import { useCampaigns } from "../../data/CampaignContext";
import type { Campaign } from "../../data/campaigns";

const COLORS = {
  primary: "#5046E5",
  background: "#F5F8FC",
  white: "#FFFFFF",
  heading: "#11182B",
  text: "#596A83",
  muted: "#71829B",
  border: "#E4EAF2",
  track: "#F1F5F9",
};

const categories = [
  "All Categories",
  "Art",
  "Civic",
  "Community",
  "Consumer",
  "Economic Policy",
  "Education",
  "Environment",
  "Food & Beverage",
  "Health",
];

type SortOption = "Recommended" | "Most Funded" | "Least Funded" | "Title A–Z";

function money(amount: number) {
  return "$" + amount.toLocaleString("en-US");
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const percentage = Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100,
  );

  return (
    <View style={styles.card}>
      <ImageBackground
        source={{ uri: campaign.image }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <View style={styles.categoryBadge}>
          <Ionicons name={campaign.icon} size={15} color={COLORS.primary} />
          <Text style={styles.badgeText}>{campaign.category}</Text>
        </View>
      </ImageBackground>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{campaign.title}</Text>

        <Text style={styles.byline}>
          by <Text style={styles.creator}>{campaign.creator}</Text>
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {campaign.description}
        </Text>

        <View style={styles.fundingRow}>
          <Text style={styles.raised}>{money(campaign.raised)}</Text>
          <Text style={styles.goalText}>
            {percentage}% of {money(campaign.goal)}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>

        <Text style={styles.daysLeft}>{campaign.daysLeft} days left</Text>

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/campaign/[id]",
              params: { id: campaign.id },
            })
          }
        >
          <Text style={styles.backButtonText}>Back this Campaign</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const { campaigns } = useCampaigns();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sort, setSort] = useState<SortOption>("Recommended");
  const [showSortOptions, setShowSortOptions] = useState(false);

  const filteredCampaigns = useMemo(() => {
    let result = campaigns.filter((campaign) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        campaign.title.toLowerCase().includes(query) ||
        campaign.description.toLowerCase().includes(query) ||
        campaign.creator.toLowerCase().includes(query) ||
        campaign.category.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === "All Categories" ||
        campaign.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    if (sort === "Most Funded") {
      result = [...result].sort(
        (a, b) => b.raised / b.goal - a.raised / a.goal,
      );
    } else if (sort === "Least Funded") {
      result = [...result].sort(
        (a, b) => a.raised / a.goal - b.raised / b.goal,
      );
    } else if (sort === "Title A–Z") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [search, selectedCategory, sort]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <CommonHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.heroWrapper}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&auto=format&fit=crop&q=85",
            }}
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            <View style={styles.heroOverlay}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>FEATURED CAMPAIGN</Text>
              </View>

              <Text style={styles.heroTitle}>
                Campaigns reviewed for accuracy. Funded by people like you.
              </Text>

              <Text style={styles.heroDescription}>
                Supporting better media shouldn't feel out of reach — your
                support changes what communities see.
              </Text>

              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => {
                  setSelectedCategory("All Categories");
                  setSearch("");
                }}
              >
                <Text style={styles.heroButtonText}>Start Exploring</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Search and sort */}
        <View style={styles.controls}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={21} color="#94A3B8" />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search campaigns by title..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Search campaigns"
            />

            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <Text style={styles.sortButtonText}>{sort}</Text>
            <Ionicons
              name={showSortOptions ? "chevron-up" : "chevron-down"}
              size={17}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>

        {showSortOptions && (
          <View style={styles.sortOptions}>
            {(
              [
                "Recommended",
                "Most Funded",
                "Least Funded",
                "Title A–Z",
              ] as SortOption[]
            ).map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setSort(option);
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sort === option && styles.selectedSortText,
                  ]}
                >
                  {option}
                </Text>

                {sort === option && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Categories */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {categories.map((category) => {
              const active = selectedCategory === category;

              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoryPill,
                    active && styles.activeCategoryPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      active && styles.activeCategoryText,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Results */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {selectedCategory === "All Categories"
              ? "Explore campaigns"
              : selectedCategory}
          </Text>

          <Text style={styles.resultsCount}>
            {filteredCampaigns.length}{" "}
            {filteredCampaigns.length === 1 ? "campaign" : "campaigns"}
          </Text>
        </View>

        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => (
            <View key={campaign.id} style={styles.cardWrapper}>
              <CampaignCard campaign={campaign} />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={42} color="#94A3B8" />

            <Text style={styles.emptyTitle}>No campaigns found</Text>

            <Text style={styles.emptyDescription}>
              Try another search term or choose a different category.
            </Text>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearch("");
                setSelectedCategory("All Categories");
              }}
            >
              <Text style={styles.clearButtonText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Ionicons name="radio-outline" size={25} color={COLORS.primary} />
          <Text style={styles.footerBrand}>Campaigns</Text>
          <Text style={styles.footerText}>Reach beyond your feed.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
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

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  brandText: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.heading,
    letterSpacing: -0.6,
  },

  menuButton: {
    height: 42,
    width: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },

  scrollContent: {
    paddingBottom: 25,
  },

  heroWrapper: {
    paddingHorizontal: 15,
    paddingTop: 16,
  },

  hero: {
    minHeight: 390,
    justifyContent: "flex-end",
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#334155",
  },

  heroImage: {
    borderRadius: 22,
  },

  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    backgroundColor: "rgba(10, 15, 30, 0.64)",
    borderRadius: 22,
  },

  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 17,
  },

  featuredBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "900",
    letterSpacing: -0.9,
    color: COLORS.white,
    marginBottom: 14,
  },

  heroDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#F1F5F9",
    marginBottom: 22,
  },

  heroButton: {
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  heroButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  controls: {
    paddingHorizontal: 16,
    marginTop: 22,
    gap: 11,
  },

  searchBox: {
    minHeight: 51,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.heading,
    paddingVertical: 12,
  },

  sortButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  sortButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.heading,
  },

  sortOptions: {
    marginHorizontal: 16,
    marginTop: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },

  sortOption: {
    minHeight: 45,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  sortOptionText: {
    fontSize: 13,
    color: COLORS.text,
  },

  selectedSortText: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  categorySection: {
    marginTop: 20,
  },

  categoryList: {
    paddingHorizontal: 16,
    gap: 9,
  },

  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  activeCategoryPill: {
    backgroundColor: COLORS.heading,
    borderColor: COLORS.heading,
  },

  categoryPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  activeCategoryText: {
    color: COLORS.white,
  },

  resultsHeader: {
    marginHorizontal: 16,
    marginTop: 27,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  resultsTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COLORS.heading,
  },

  resultsCount: {
    fontSize: 12,
    color: COLORS.muted,
  },

  cardWrapper: {
    paddingHorizontal: 16,
  },

  card: {
    marginBottom: 18,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardImage: {
    height: 185,
    padding: 13,
    justifyContent: "flex-start",
    backgroundColor: "#CBD5E1",
  },

  cardImageStyle: {
    resizeMode: "cover",
  },

  categoryBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.96)",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.heading,
  },

  cardContent: {
    padding: 17,
  },

  cardTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.heading,
  },

  byline: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.muted,
  },

  creator: {
    color: COLORS.text,
    fontWeight: "700",
  },

  description: {
    marginTop: 13,
    marginBottom: 19,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.text,
  },

  fundingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
  },

  raised: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.heading,
  },

  goalText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  progressTrack: {
    height: 8,
    borderRadius: 20,
    backgroundColor: COLORS.track,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },

  daysLeft: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 15,
  },

  backButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE58A",
    borderRadius: 12,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  emptyState: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 45,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.heading,
  },

  emptyDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.muted,
  },

  clearButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
  },

  clearButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.white,
  },

  footer: {
    alignItems: "center",
    paddingVertical: 27,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 10,
    backgroundColor: COLORS.white,
  },

  footerBrand: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.heading,
  },

  footerText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.muted,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.28)",
    justifyContent: "flex-start",
  },
  menuPanel: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.white,
    paddingTop: 8,
  },
  menuHeader: {
    height: 64,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItems: { paddingHorizontal: 23, paddingTop: 14, paddingBottom: 28 },
  menuItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  menuItemText: {
    flex: 1,
    color: COLORS.heading,
    fontSize: 16,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 13,
    marginBottom: 16,
  },
  menuOutlineButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  menuOutlineText: { color: COLORS.heading, fontSize: 14, fontWeight: "800" },
  menuSubscribe: { color: COLORS.primary, fontSize: 14, fontWeight: "800" },
  menuCreateButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 1,
  },
  menuCreateText: { color: COLORS.white, fontSize: 14, fontWeight: "800" },
});
