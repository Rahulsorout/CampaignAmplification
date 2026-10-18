import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { campaigns as initialCampaigns, type Campaign } from "./campaigns";

const DRAFTS_STORAGE_KEY = "@campaign_amplification_drafts";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type StorySection = {
  heading: string;
  body: string;
};

export type CampaignSource = {
  title: string;
  url: string;
};

export type CampaignDraft = {
  id: string;
  title: string;
  category: string;
  description: string;
  goal: string;
  imageUrl: string;
  updatedAt: string;

  creatorName?: string;
  creatorSummary?: string;

  storyHeadline?: string;
  storyIntro?: string;
  storySections?: StorySection[];
  sources?: CampaignSource[];
  audienceActions?: string[];

  adHeadline?: string;
  adDescription?: string;
  adImageUrl?: string;
  adCta?: string;

  targetLocations?: string[];
  audienceInterests?: string[];
  distributionChannels?: string[];

  adBudget?: string;
  durationDays?: string;
  campaignDurationDays?: string;
  estimatedReach?: string;
  currentStep?: number;
};

export type CampaignSubmission = {
  title: string;
  category: string;
  creatorName: string;
  creatorSummary: string;
  description: string;
  goal: number;
  imageUrl: string;

  storyHeadline: string;
  storyIntro: string;
  storySections: StorySection[];
  sources: CampaignSource[];
  audienceActions: string[];

  adHeadline: string;
  adDescription: string;
  adImageUrl: string;
  adCta: string;

  targetLocations: string[];
  audienceInterests: string[];
  distributionChannels: string[];

  adBudget: number;

  // Matches the Create screen's submission object.
  campaignDurationDays: number;

  estimatedReach: number;
};

type CampaignContextType = {
  campaigns: Campaign[];

  addCampaign: (campaign: Campaign) => Promise<void>;
  submitCampaign: (submission: CampaignSubmission) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;

  isLoading: boolean;
  refreshCampaigns: () => Promise<void>;

  drafts: CampaignDraft[];
  draftsLoading: boolean;
  saveDraft: (draft: CampaignDraft) => void;
  updateDraft: (draft: CampaignDraft) => void;
  deleteDraft: (id: string) => void;
};

type DatabaseCampaign = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  creator: string;
  description: string;
  goal: number | string;
  raised: number | string;
  days_left: number;
  image: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────
// Database mapping
// ─────────────────────────────────────────────

function mapDatabaseCampaign(row: DatabaseCampaign): Campaign {
  return {
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
  };
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined,
);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);

  const [isLoading, setIsLoading] = useState(true);

  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  // ───────────────────────────────────────────
  // Fetch campaigns
  // ───────────────────────────────────────────

  const refreshCampaigns = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id, user_id, title, category, creator, description, goal, raised, days_left, image, icon, created_at, updated_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const databaseCampaigns = (data ?? []) as DatabaseCampaign[];

      const onlineCampaigns = databaseCampaigns.map(mapDatabaseCampaign);

      setCampaigns([...onlineCampaigns, ...initialCampaigns]);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);

      setCampaigns((previous) =>
        previous.length > 0 ? previous : initialCampaigns,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  // ───────────────────────────────────────────
  // Load saved drafts
  // ───────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function loadDrafts() {
      try {
        const storedDrafts = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);

        if (storedDrafts && mounted) {
          const parsedDrafts = JSON.parse(storedDrafts) as CampaignDraft[];

          setDrafts(parsedDrafts);
        }
      } catch (error) {
        console.error("Failed to load campaign drafts:", error);
      } finally {
        if (mounted) {
          setDraftsLoading(false);
          setDraftsLoaded(true);
        }
      }
    }

    void loadDrafts();

    return () => {
      mounted = false;
    };
  }, []);

  // ───────────────────────────────────────────
  // Persist drafts
  // ───────────────────────────────────────────

  useEffect(() => {
    if (!draftsLoaded) {
      return;
    }

    AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts)).catch(
      (error: unknown) => {
        console.error("Failed to save campaign drafts:", error);
      },
    );
  }, [drafts, draftsLoaded]);

  // ───────────────────────────────────────────
  // Add a basic campaign
  // Retained for compatibility with existing screens.
  // ───────────────────────────────────────────

  const addCampaign = useCallback(
    async (campaign: Campaign) => {
      if (!user) {
        throw new Error("Please log in before creating a campaign.");
      }

      const creator =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        campaign.creator;

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          title: campaign.title,
          category: campaign.category,
          creator,
          description: campaign.description,
          goal: campaign.goal,
          raised: campaign.raised,
          days_left: campaign.daysLeft,
          image: campaign.image,
          icon: campaign.icon,
        })
        .select(
          "id, user_id, title, category, creator, description, goal, raised, days_left, image, icon, created_at, updated_at",
        )
        .single();

      if (error) {
        console.error("Failed to create campaign:", error);

        throw new Error(error.message);
      }

      const savedCampaign = mapDatabaseCampaign(data as DatabaseCampaign);

      setCampaigns((previous) => [
        savedCampaign,
        ...previous.filter((item) => item.id !== savedCampaign.id),
      ]);
    },
    [user],
  );

  // ───────────────────────────────────────────
  // Submit the complete five-step campaign
  // ───────────────────────────────────────────

  const submitCampaign = useCallback(
    async (submission: CampaignSubmission): Promise<Campaign> => {
      if (!user) {
        throw new Error("Please log in before submitting a campaign.");
      }

      const creator =
        submission.creatorName.trim() ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "Campaign Creator";

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,

          // Basics
          title: submission.title.trim(),
          category: submission.category,
          creator,
          creator_summary: submission.creatorSummary.trim(),
          description: submission.description.trim(),

          goal: submission.goal,
          raised: 0,
          days_left: submission.campaignDurationDays,
          image: submission.imageUrl.trim(),
          icon: "megaphone-outline",

          // Story
          story_headline: submission.storyHeadline.trim(),
          story_intro: submission.storyIntro.trim(),
          story_sections: submission.storySections,
          sources: submission.sources,
          audience_actions: submission.audienceActions,

          // Campaign and ad visuals
          ad_headline: submission.adHeadline.trim() || submission.title.trim(),
          ad_description: submission.adDescription.trim(),
          ad_image_url: submission.adImageUrl.trim(),
          ad_cta: submission.adCta.trim() || "Learn More",

          // Reach and distribution
          target_locations: submission.targetLocations,
          audience_interests: submission.audienceInterests,
          distribution_channels: submission.distributionChannels,
          ad_budget: submission.adBudget,
          campaign_duration_days: submission.campaignDurationDays,
          estimated_reach: submission.estimatedReach,

          // Submitted campaigns require review.
          status: "submitted_for_review",
          submitted_at: new Date().toISOString(),
        })
        .select(
          "id, user_id, title, category, creator, description, goal, raised, days_left, image, icon, created_at, updated_at",
        )
        .single();

      if (error) {
        console.error("Failed to submit campaign:", error);

        throw new Error(error.message);
      }

      const savedCampaign = mapDatabaseCampaign(data as DatabaseCampaign);

      setCampaigns((previous) => [
        savedCampaign,
        ...previous.filter((item) => item.id !== savedCampaign.id),
      ]);

      return savedCampaign;
    },
    [user],
  );

  // ───────────────────────────────────────────
  // Delete a campaign
  // ───────────────────────────────────────────

  const deleteCampaign = useCallback(
    async (id: string) => {
      if (!user) {
        throw new Error("Please log in to delete a campaign.");
      }

      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to delete campaign:", error);

        throw new Error(error.message);
      }

      setCampaigns((previous) => previous.filter((item) => item.id !== id));
    },
    [user],
  );

  // ───────────────────────────────────────────
  // Save a draft
  // ───────────────────────────────────────────

  const saveDraft = useCallback((draft: CampaignDraft) => {
    setDrafts((previous) => {
      if (previous.some((item) => item.id === draft.id)) {
        return previous.map((item) => (item.id === draft.id ? draft : item));
      }

      return [draft, ...previous];
    });
  }, []);

  // ───────────────────────────────────────────
  // Update a draft
  // ───────────────────────────────────────────

  const updateDraft = useCallback((draft: CampaignDraft) => {
    setDrafts((previous) =>
      previous.map((item) => (item.id === draft.id ? draft : item)),
    );
  }, []);

  // ───────────────────────────────────────────
  // Delete a draft
  // ───────────────────────────────────────────

  const deleteDraft = useCallback((id: string) => {
    setDrafts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  // ───────────────────────────────────────────
  // Provider
  // ───────────────────────────────────────────

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        addCampaign,
        submitCampaign,
        deleteCampaign,
        isLoading,
        refreshCampaigns,
        drafts,
        draftsLoading,
        saveDraft,
        updateDraft,
        deleteDraft,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useCampaigns() {
  const context = useContext(CampaignContext);

  if (!context) {
    throw new Error("useCampaigns must be used within a CampaignProvider.");
  }

  return context;
}
