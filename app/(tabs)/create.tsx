import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { supabase } from "../../lib/supabase";

import CommonHeader from "../../components/CommonHeader";
import { useAuth } from "../../data/AuthContext";
import { useCampaigns, type CampaignDraft } from "../../data/CampaignContext";

const C = {
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  background: "#F8FAFC",
  white: "#FFFFFF",
  heading: "#0F172A",
  text: "#475569",
  muted: "#64748B",
  border: "#E2E8F0",
  subtle: "#F1F5F9",
  green: "#15803D",
  greenLight: "#F0FDF4",
  red: "#DC2626",
  redLight: "#FEF2F2",
};

const STEPS = [
  {
    title: "Basics",
    subtitle: "Introduce your campaign",
    icon: "document-text-outline",
  },
  { title: "Story", subtitle: "Explain why it matters", icon: "book-outline" },
  {
    title: "Ad visuals",
    subtitle: "Prepare your message",
    icon: "images-outline",
  },
  { title: "Reach", subtitle: "Plan your audience", icon: "people-outline" },
  {
    title: "Submit",
    subtitle: "Review everything",
    icon: "checkmark-circle-outline",
  },
] as const;

const CATEGORIES = [
  "Art",
  "Arts & Culture",
  "Business",
  "Civic",
  "Community",
  "Consumer",
  "Economic Policy",
  "Education",
  "Environment",
  "Health",
  "Public Policy",
  "Science",
  "Other",
];

const CHANNELS = ["Social Media", "Display Ads", "Online Video", "Search"];

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&auto=format&fit=crop&q=80";

type StorySection = {
  heading: string;
  body: string;
};

type CampaignSource = {
  title: string;
  url: string;
};

type FormState = {
  title: string;
  category: string;
  creatorName: string;
  creatorSummary: string;
  description: string;
  imageUrl: string;
  goal: string;
  storyHeadline: string;
  storyIntro: string;
  storySections: StorySection[];
  sources: CampaignSource[];
  audienceActions: string[];
  adHeadline: string;
  adDescription: string;
  adImageUrl: string;
  adCta: string;
  targetLocations: string;
  audienceInterests: string;
  distributionChannels: string[];
  adBudget: string;
  campaignDurationDays: string;
  estimatedReach: string;
};

const INITIAL_FORM: FormState = {
  title: "",
  category: "",
  creatorName: "",
  creatorSummary: "",
  description: "",
  imageUrl: "",
  goal: "",
  storyHeadline: "",
  storyIntro: "",
  storySections: [{ heading: "", body: "" }],
  sources: [{ title: "", url: "" }],
  audienceActions: [""],
  adHeadline: "",
  adDescription: "",
  adImageUrl: "",
  adCta: "Learn More",
  targetLocations: "",
  audienceInterests: "",
  distributionChannels: ["Social Media"],
  adBudget: "",
  campaignDurationDays: "30",
  estimatedReach: "",
};

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function money(value: string | number): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : "$0";
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.labelBlock}>
      <Text style={styles.label}>
        {children}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
  error,
  numberOfLines,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "url";
  maxLength?: number;
  error?: string;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize ?? "sentences"}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          error ? styles.inputError : undefined,
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.sectionTitleBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

function SmallAction({
  label,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.smallAction}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={16} color={destructive ? C.red : C.primary} />
      <Text
        style={[
          styles.smallActionText,
          destructive ? { color: C.red } : undefined,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CreateCampaignScreen() {
  const {
    drafts,
    draftsLoading,
    saveDraft,
    updateDraft,
    deleteDraft,
    submitCampaign,
  } = useCampaigns();
  const { user } = useAuth();

  const { width } = useWindowDimensions();
  const compact = width < 390;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [useDummyImage, setUseDummyImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submissionLock = useRef(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));

    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  async function pickCampaignImage(target: "cover" | "ad") {
    if (useDummyImage) {
      Alert.alert(
        "Dummy image selected",
        "Untick “I don't have an image” before uploading your own image.",
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access needed",
        "Allow photo library access to choose a campaign image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const selectedUri = result.assets[0].uri;
    setUploadingImage(true);
    try {
      if (target === "cover") {
        update("imageUrl", selectedUri);
      } else {
        update("adImageUrl", selectedUri);
      }
    } finally {
      setUploadingImage(false);
    }
  }

  async function uploadLocalImageIfNeeded(
    uri: string,
    imageType: "cover" | "ad",
  ): Promise<string> {
    if (!uri || !(uri.startsWith("file://") || uri.startsWith("content://")))
      return uri;

    const response = await fetch(uri);
    const blob = await response.blob();
    const extensionMatch = uri.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
    const extension = extensionMatch?.[1]?.toLowerCase() || "jpg";
    const contentType =
      blob.type || `image/${extension === "jpg" ? "jpeg" : extension}`;
    const filePath = `${user?.id ?? "anonymous"}/${Date.now()}-${imageType}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("campaign-images")
      .upload(filePath, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        `Image upload failed: ${uploadError.message}. Ensure the Supabase Storage bucket “campaign-images” exists and allows authenticated uploads.`,
      );
    }

    const { data } = supabase.storage
      .from("campaign-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  const reachEstimate = useMemo(() => {
    const entered = Number(form.estimatedReach);
    if (Number.isFinite(entered) && entered > 0) return Math.floor(entered);

    const budget = Number(form.adBudget);
    if (Number.isFinite(budget) && budget > 0) {
      // Illustrative demo assumption, not a guaranteed advertising outcome.
      return Math.round(budget * 100);
    }

    return 0;
  }, [form.adBudget, form.estimatedReach]);

  async function handleGenerateCampaign() {
    const prompt = aiPrompt.trim();

    if (prompt.length < 10) {
      Alert.alert(
        "Add a little more detail",
        "Describe your campaign idea in at least 10 characters.",
      );
      return;
    }

    if (generatingAI) return;
    setGeneratingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-campaign",
        { body: { prompt } },
      );

      if (error) {
        console.error("AI campaign function error:", error);
        throw new Error(
          "The AI generator couldn't be reached. Check your connection and try again.",
        );
      }

      const generated = data?.campaign;

      if (!generated || typeof generated !== "object") {
        throw new Error("The AI response was incomplete. Please try again.");
      }

      const allowedCategories = CATEGORIES as readonly string[];
      const generatedCategory =
        typeof generated.category === "string" &&
        allowedCategories.includes(generated.category)
          ? generated.category
          : "Other";

      setForm((previous) => ({
        ...previous,
        title:
          typeof generated.title === "string"
            ? generated.title.slice(0, 60)
            : previous.title,
        category: generatedCategory,
        creatorSummary:
          typeof generated.creatorSummary === "string"
            ? generated.creatorSummary
            : previous.creatorSummary,
        description:
          typeof generated.description === "string"
            ? generated.description
            : previous.description,
        storyHeadline:
          typeof generated.storyHeadline === "string"
            ? generated.storyHeadline
            : previous.storyHeadline,
        storyIntro:
          typeof generated.storyIntro === "string"
            ? generated.storyIntro
            : previous.storyIntro,
        storySections: Array.isArray(generated.storySections)
          ? generated.storySections
              .filter(
                (
                  section: unknown,
                ): section is { heading?: string; body?: string } =>
                  typeof section === "object" && section !== null,
              )
              .map((section: { heading?: string; body?: string }) => ({
                heading:
                  typeof section.heading === "string" ? section.heading : "",
                body: typeof section.body === "string" ? section.body : "",
              }))
          : previous.storySections,
        adHeadline:
          typeof generated.adHeadline === "string"
            ? generated.adHeadline.slice(0, 80)
            : previous.adHeadline,
        adDescription:
          typeof generated.adDescription === "string"
            ? generated.adDescription
            : previous.adDescription,
        adCta:
          typeof generated.adCta === "string"
            ? generated.adCta
            : previous.adCta,
      }));

      setStep(0);
      setErrors({});
      Alert.alert(
        "Campaign draft generated",
        "AI filled in a starting draft. Review and edit every field, add your sources and creator details, and verify all claims before submitting.",
      );
    } catch (error) {
      console.error("Campaign generation failed:", error);
      Alert.alert(
        "Couldn't generate campaign",
        error instanceof Error
          ? error.message
          : "Please try again in a moment.",
      );
    } finally {
      setGeneratingAI(false);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setStep(0);
    setEditingDraftId(null);
    setAcceptedTerms(false);
    setUseDummyImage(false);
    setErrors({});
  }

  function makeDraft(): CampaignDraft {
    return {
      id: editingDraftId ?? `draft-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      goal: form.goal.trim(),
      imageUrl: form.imageUrl.trim(),
      creatorName: form.creatorName.trim(),
      creatorSummary: form.creatorSummary.trim(),
      storyHeadline: form.storyHeadline.trim(),
      storyIntro: form.storyIntro.trim(),
      storySections: form.storySections,
      sources: form.sources,
      audienceActions: form.audienceActions,
      adHeadline: form.adHeadline.trim(),
      adDescription: form.adDescription.trim(),
      adImageUrl: form.adImageUrl.trim(),
      adCta: form.adCta.trim() || "Learn More",
      targetLocations: parseList(form.targetLocations),
      audienceInterests: parseList(form.audienceInterests),
      distributionChannels: form.distributionChannels,
      adBudget: form.adBudget,
      campaignDurationDays: form.campaignDurationDays,
      estimatedReach: form.estimatedReach,
      updatedAt: new Date().toISOString(),
    };
  }

  function handleSaveDraft() {
    if (draftsLoading) {
      Alert.alert("Please wait", "Your saved drafts are still loading.");
      return;
    }

    const hasContent =
      form.title.trim() ||
      form.description.trim() ||
      form.category ||
      form.storyIntro.trim() ||
      form.adHeadline.trim();

    if (!hasContent) {
      Alert.alert(
        "Nothing to save yet",
        "Add some campaign details before saving your draft.",
      );
      return;
    }

    setSaving(true);

    try {
      const draft = makeDraft();

      if (editingDraftId) {
        updateDraft(draft);
      } else {
        saveDraft(draft);
        setEditingDraftId(draft.id);
      }

      Alert.alert(
        "Draft saved",
        "Your progress has been saved on this device. You can return to it later.",
      );
    } catch (error) {
      console.error("Draft save failed:", error);
      Alert.alert("Couldn't save draft", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function resumeDraft(draft: CampaignDraft) {
    setForm({
      ...INITIAL_FORM,
      title: draft.title ?? "",
      category: draft.category ?? "",
      description: draft.description ?? "",
      goal: String(draft.goal ?? ""),
      imageUrl: draft.imageUrl ?? "",
      creatorName: draft.creatorName ?? "",
      creatorSummary: draft.creatorSummary ?? "",
      storyHeadline: draft.storyHeadline ?? "",
      storyIntro: draft.storyIntro ?? "",
      storySections: draft.storySections?.length
        ? draft.storySections
        : INITIAL_FORM.storySections,
      sources: draft.sources?.length ? draft.sources : INITIAL_FORM.sources,
      audienceActions: draft.audienceActions?.length
        ? draft.audienceActions
        : INITIAL_FORM.audienceActions,
      adHeadline: draft.adHeadline ?? "",
      adDescription: draft.adDescription ?? "",
      adImageUrl: draft.adImageUrl ?? "",
      adCta: draft.adCta ?? "Learn More",
      targetLocations: Array.isArray(draft.targetLocations)
        ? draft.targetLocations.join(", ")
        : "",
      audienceInterests: Array.isArray(draft.audienceInterests)
        ? draft.audienceInterests.join(", ")
        : "",
      distributionChannels: draft.distributionChannels?.length
        ? draft.distributionChannels
        : ["Social Media"],
      adBudget: String(draft.adBudget ?? ""),
      campaignDurationDays: String(draft.campaignDurationDays ?? "30"),
      estimatedReach: String(draft.estimatedReach ?? ""),
    });

    setEditingDraftId(draft.id);
    setStep(0);
    setErrors({});
    setShowDrafts(false);
    setAcceptedTerms(false);
  }

  function confirmDeleteDraft(draft: CampaignDraft) {
    Alert.alert(
      "Delete this draft?",
      `“${draft.title || "Untitled campaign"}” will be removed from your saved drafts.`,
      [
        { text: "Keep draft", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteDraft(draft.id);

            if (editingDraftId === draft.id) resetForm();
          },
        },
      ],
    );
  }

  function validateStep(stepToValidate: number): boolean {
    const nextErrors: Record<string, string> = {};

    if (stepToValidate === 0) {
      if (form.title.trim().length < 5) {
        nextErrors.title = "Use a title with at least 5 characters.";
      } else if (form.title.trim().length > 60) {
        nextErrors.title = "Keep the title within 60 characters.";
      }

      if (!form.category) {
        nextErrors.category = "Choose a campaign category.";
      }

      if (!form.creatorName.trim()) {
        nextErrors.creatorName = "Enter your name or organization.";
      }

      if (form.description.trim().length < 20) {
        nextErrors.description =
          "Add a short summary of at least 20 characters.";
      }

      if (
        !useDummyImage &&
        form.imageUrl.trim() &&
        !isValidHttpUrl(form.imageUrl) &&
        !(
          form.imageUrl.startsWith("file://") ||
          form.imageUrl.startsWith("content://")
        )
      ) {
        nextErrors.imageUrl =
          "Choose an image or enter a valid HTTP or HTTPS image URL.";
      }
    }

    if (stepToValidate === 1) {
      if (!form.storyHeadline.trim()) {
        nextErrors.storyHeadline = "Add a headline for your story.";
      }

      if (form.storyIntro.trim().length < 30) {
        nextErrors.storyIntro =
          "Write an introduction of at least 30 characters.";
      }

      form.sources.forEach((source, index) => {
        if (source.url.trim() && !isValidHttpUrl(source.url)) {
          nextErrors[`source-${index}`] =
            "Use a valid HTTP or HTTPS source URL.";
        }
      });
    }

    if (stepToValidate === 2) {
      if (!form.adHeadline.trim()) {
        nextErrors.adHeadline = "Add a headline for your ad.";
      }

      if (form.adDescription.trim().length < 10) {
        nextErrors.adDescription =
          "Add a short description of at least 10 characters.";
      }

      if (
        !useDummyImage &&
        form.adImageUrl.trim() &&
        !isValidHttpUrl(form.adImageUrl) &&
        !(
          form.adImageUrl.startsWith("file://") ||
          form.adImageUrl.startsWith("content://")
        )
      ) {
        nextErrors.adImageUrl =
          "Choose an image or enter a valid HTTP or HTTPS image URL.";
      }
    }

    if (stepToValidate === 3) {
      const goal = Number(form.goal);
      const budget = Number(form.adBudget);
      const duration = Number(form.campaignDurationDays);

      if (!form.goal.trim() || !Number.isFinite(goal) || goal < 1) {
        nextErrors.goal = "Enter a funding goal of at least $1.";
      }

      if (!form.adBudget.trim() || !Number.isFinite(budget) || budget < 0) {
        nextErrors.adBudget = "Enter a valid advertising budget.";
      } else if (budget > goal) {
        nextErrors.adBudget =
          "The advertising budget cannot exceed the funding goal.";
      }

      if (!Number.isInteger(duration) || duration < 1 || duration > 365) {
        nextErrors.campaignDurationDays =
          "Choose a duration between 1 and 365 days.";
      }

      if (form.distributionChannels.length === 0) {
        nextErrors.distributionChannels =
          "Select at least one distribution channel.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinue() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function handleBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    if (submissionLock.current) return;

    if (
      !validateStep(0) ||
      !validateStep(1) ||
      !validateStep(2) ||
      !validateStep(3)
    ) {
      Alert.alert(
        "A few details are missing",
        "Please complete the required fields in each step before submitting.",
      );
      return;
    }

    if (!acceptedTerms) {
      setErrors((previous) => ({
        ...previous,
        terms:
          "Please confirm that your campaign follows the submission rules.",
      }));
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);

    try {
      const goal = Number(form.goal);
      const budget = Number(form.adBudget);
      const duration = Number(form.campaignDurationDays);

      const coverImageUrl = useDummyImage
        ? DEFAULT_COVER
        : await uploadLocalImageIfNeeded(form.imageUrl.trim(), "cover");
      const advertisingImageUrl = useDummyImage
        ? DEFAULT_COVER
        : await uploadLocalImageIfNeeded(form.adImageUrl.trim(), "ad");

      await submitCampaign({
        title: form.title.trim(),
        category: form.category,
        creatorName: form.creatorName.trim(),
        creatorSummary: form.creatorSummary.trim(),
        description: form.description.trim(),
        imageUrl: coverImageUrl || DEFAULT_COVER,
        goal,
        storyHeadline: form.storyHeadline.trim(),
        storyIntro: form.storyIntro.trim(),
        storySections: form.storySections.filter(
          (section) => section.heading.trim() || section.body.trim(),
        ),
        sources: form.sources.filter(
          (source) => source.title.trim() || source.url.trim(),
        ),
        audienceActions: form.audienceActions
          .map((action) => action.trim())
          .filter(Boolean),
        adHeadline: form.adHeadline.trim(),
        adDescription: form.adDescription.trim(),
        adImageUrl: advertisingImageUrl || coverImageUrl || DEFAULT_COVER,
        adCta: form.adCta.trim() || "Learn More",
        targetLocations: parseList(form.targetLocations),
        audienceInterests: parseList(form.audienceInterests),
        distributionChannels: form.distributionChannels,
        adBudget: budget,
        campaignDurationDays: duration,
        estimatedReach: reachEstimate,
      });

      if (editingDraftId) {
        deleteDraft(editingDraftId);
      }

      resetForm();
      setShowSuccess(true);
    } catch (error) {
      console.error("Campaign submission failed:", error);
      Alert.alert(
        "Submission unsuccessful",
        error instanceof Error
          ? error.message
          : "We couldn't submit your campaign. Your draft has not been deleted, so please try again.",
      );
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== 0) return;

    // Keep the active draft up to date while editing it.
    if (!editingDraftId || draftsLoading) return;

    const timer = setTimeout(() => {
      try {
        updateDraft(makeDraft());
      } catch (error) {
        console.warn("Automatic draft update failed:", error);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [form, editingDraftId, step, draftsLoading]);

  function renderError(key: string) {
    return errors[key] ? (
      <Text style={styles.errorText}>{errors[key]}</Text>
    ) : null;
  }

  function renderCategoryPicker() {
    return (
      <View style={styles.chipWrap}>
        {CATEGORIES.map((item) => {
          const selected = form.category === item;

          return (
            <TouchableOpacity
              key={item}
              onPress={() => update("category", item)}
              activeOpacity={0.75}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {item}
              </Text>
              {selected ? (
                <Ionicons name="checkmark-circle" size={15} color={C.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderBasics() {
    return (
      <>
        <View style={styles.aiGeneratorCard}>
          <View style={styles.aiGeneratorHeader}>
            <View style={styles.aiGeneratorIcon}>
              <Ionicons name="sparkles" size={22} color={C.primary} />
            </View>
            <View style={styles.aiGeneratorHeading}>
              <Text style={styles.aiGeneratorTitle}>Create with AI</Text>
              <Text style={styles.aiGeneratorSubtitle}>
                Start with an idea. AI will draft your campaign, story and ad
                copy.
              </Text>
            </View>
          </View>

          <TextInput
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder="Describe the message you want to amplify and why it matters..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={2000}
            editable={!generatingAI}
            style={styles.aiPromptInput}
          />

          <View style={styles.aiGeneratorFooter}>
            <Text style={styles.aiPromptHint}>
              {aiPrompt.length}/2000 · Don't include private information.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleGenerateCampaign}
              disabled={generatingAI || aiPrompt.trim().length < 10}
              activeOpacity={0.85}
              style={[
                styles.aiGenerateButton,
                (generatingAI || aiPrompt.trim().length < 10) &&
                  styles.disabledButton,
              ]}
            >
              {generatingAI ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Ionicons name="sparkles" size={17} color={C.white} />
              )}
              <Text style={styles.aiGenerateButtonText}>
                {generatingAI ? "Generating..." : "Generate draft"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.aiDisclaimer}>
            AI can make mistakes. Review the generated text, add reliable
            sources, and correct any unsupported claims before continuing.
          </Text>
        </View>

        <SectionTitle
          title="The essentials"
          description="Start with a clear message people can understand at a glance."
        />

        <FieldLabel required>Campaign title</FieldLabel>
        <FormInput
          value={form.title}
          onChangeText={(value) => update("title", value)}
          placeholder="What do you want people to know?"
          maxLength={60}
          error={errors.title}
        />
        <Text style={styles.characterCount}>
          {form.title.length}/60 characters
        </Text>

        <View style={styles.field}>
          <FieldLabel required>Category</FieldLabel>
          {renderCategoryPicker()}
          {renderError("category")}
        </View>

        <View style={styles.field}>
          <FieldLabel required>Creator or organization</FieldLabel>
          <FormInput
            value={form.creatorName}
            onChangeText={(value) => update("creatorName", value)}
            placeholder="Your name or organization"
            error={errors.creatorName}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel hint="Optional · Tell readers who you are.">
            About the creator
          </FieldLabel>
          <FormInput
            value={form.creatorSummary}
            onChangeText={(value) => update("creatorSummary", value)}
            placeholder="A short introduction to you or your organization"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel required hint="This summary appears on campaign cards.">
            Campaign summary
          </FieldLabel>
          <FormInput
            value={form.description}
            onChangeText={(value) => update("description", value)}
            placeholder="Explain the message and why it matters..."
            multiline
            numberOfLines={5}
            error={errors.description}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel hint="Upload from your device or paste a public image URL.">
            Cover image
          </FieldLabel>
          <FormInput
            value={form.imageUrl}
            onChangeText={(value) => {
              update("imageUrl", value);
              if (value.trim()) setUseDummyImage(false);
            }}
            placeholder="https://example.com/image.jpg"
            keyboardType="url"
            autoCapitalize="none"
            error={errors.imageUrl}
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => pickCampaignImage("cover")}
            activeOpacity={0.8}
            style={styles.imageUploadButton}
            disabled={uploadingImage || useDummyImage}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={C.primary} />
            <Text style={styles.imageUploadButtonText}>
              {uploadingImage ? "Selecting image..." : "Upload from device"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: useDummyImage }}
            onPress={() => {
              const nextValue = !useDummyImage;
              setUseDummyImage(nextValue);
              if (nextValue) {
                update("imageUrl", "");
                update("adImageUrl", "");
                setErrors((previous) => {
                  const next = { ...previous };
                  delete next.imageUrl;
                  delete next.adImageUrl;
                  return next;
                });
              }
            }}
            style={styles.imageCheckboxRow}
            activeOpacity={0.8}
          >
            <View
              style={[styles.checkbox, useDummyImage && styles.checkboxChecked]}
            >
              {useDummyImage ? (
                <Ionicons name="checkmark" size={15} color={C.white} />
              ) : null}
            </View>
            <View style={styles.imageCheckboxCopy}>
              <Text style={styles.imageCheckboxTitle}>
                I don't have an image
              </Text>
              <Text style={styles.imageCheckboxHint}>
                We'll use the existing dummy image automatically.
              </Text>
            </View>
          </TouchableOpacity>
          {form.imageUrl.trim() ? (
            <Image
              source={{ uri: form.imageUrl.trim() }}
              style={styles.coverPreview}
              resizeMode="cover"
            />
          ) : null}
          {useDummyImage ? (
            <Image
              source={{ uri: DEFAULT_COVER }}
              style={styles.coverPreview}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={C.primary}
          />
          <Text style={styles.infoText}>
            Your campaign will be submitted for review. Contributions fund
            message distribution, not direct donations to a cause.
          </Text>
        </View>
      </>
    );
  }

  function renderStory() {
    return (
      <>
        <SectionTitle
          title="Tell the full story"
          description="Give people enough context to understand the issue and explore the evidence."
        />

        <View style={styles.field}>
          <FieldLabel required>Story headline</FieldLabel>
          <FormInput
            value={form.storyHeadline}
            onChangeText={(value) => update("storyHeadline", value)}
            placeholder="A clear headline for your story"
            error={errors.storyHeadline}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel required>Introduction</FieldLabel>
          <FormInput
            value={form.storyIntro}
            onChangeText={(value) => update("storyIntro", value)}
            placeholder="Set the scene. What is happening, and why should people care?"
            multiline
            numberOfLines={5}
            error={errors.storyIntro}
          />
        </View>

        <View style={styles.divider} />

        <SectionTitle
          title="Story sections"
          description="Build the story in clear, readable sections."
        />

        {form.storySections.map((section, index) => (
          <View key={`section-${index}`} style={styles.nestedCard}>
            <View style={styles.nestedCardHeader}>
              <Text style={styles.nestedCardTitle}>Section {index + 1}</Text>
              {form.storySections.length > 1 ? (
                <SmallAction
                  label="Remove"
                  icon="trash-outline"
                  destructive
                  onPress={() =>
                    update(
                      "storySections",
                      form.storySections.filter((_, i) => i !== index),
                    )
                  }
                />
              ) : null}
            </View>

            <View style={styles.field}>
              <FieldLabel>Section heading</FieldLabel>
              <FormInput
                value={section.heading}
                onChangeText={(value) =>
                  update(
                    "storySections",
                    form.storySections.map((item, i) =>
                      i === index ? { ...item, heading: value } : item,
                    ),
                  )
                }
                placeholder="What is this section about?"
              />
            </View>

            <View style={styles.fieldLast}>
              <FieldLabel>Section content</FieldLabel>
              <FormInput
                value={section.body}
                onChangeText={(value) =>
                  update(
                    "storySections",
                    form.storySections.map((item, i) =>
                      i === index ? { ...item, body: value } : item,
                    ),
                  )
                }
                placeholder="Explain the details..."
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        ))}

        <SmallAction
          label="Add story section"
          icon="add-circle-outline"
          onPress={() =>
            update("storySections", [
              ...form.storySections,
              { heading: "", body: "" },
            ])
          }
        />

        <View style={styles.divider} />

        <SectionTitle
          title="Supporting sources"
          description="Sources help readers assess the claims in your campaign."
        />

        {form.sources.map((source, index) => (
          <View key={`source-${index}`} style={styles.nestedCard}>
            <View style={styles.nestedCardHeader}>
              <Text style={styles.nestedCardTitle}>Source {index + 1}</Text>
              {form.sources.length > 1 ? (
                <SmallAction
                  label="Remove"
                  icon="trash-outline"
                  destructive
                  onPress={() =>
                    update(
                      "sources",
                      form.sources.filter((_, i) => i !== index),
                    )
                  }
                />
              ) : null}
            </View>

            <View style={styles.field}>
              <FieldLabel>Source title</FieldLabel>
              <FormInput
                value={source.title}
                onChangeText={(value) =>
                  update(
                    "sources",
                    form.sources.map((item, i) =>
                      i === index ? { ...item, title: value } : item,
                    ),
                  )
                }
                placeholder="Report, research paper, or article"
              />
            </View>

            <View style={styles.fieldLast}>
              <FieldLabel>Source URL</FieldLabel>
              <FormInput
                value={source.url}
                onChangeText={(value) =>
                  update(
                    "sources",
                    form.sources.map((item, i) =>
                      i === index ? { ...item, url: value } : item,
                    ),
                  )
                }
                placeholder="https://..."
                keyboardType="url"
                autoCapitalize="none"
                error={errors[`source-${index}`]}
              />
            </View>
          </View>
        ))}

        <SmallAction
          label="Add another source"
          icon="add-circle-outline"
          onPress={() =>
            update("sources", [...form.sources, { title: "", url: "" }])
          }
        />

        <View style={styles.field}>
          <FieldLabel hint="Separate each action with a comma.">
            Suggested audience actions
          </FieldLabel>
          <FormInput
            value={form.audienceActions.join(", ")}
            onChangeText={(value) =>
              update("audienceActions", value.split(","))
            }
            placeholder="Read the report, Share the message, Contact a representative"
            multiline
            numberOfLines={3}
          />
        </View>
      </>
    );
  }

  function renderAdVisuals() {
    return (
      <>
        <SectionTitle
          title="Create your ad"
          description="Keep your advertising creative concise and consistent with the full story."
        />

        <View style={styles.infoBox}>
          <Ionicons name="eye-outline" size={21} color={C.primary} />
          <Text style={styles.infoText}>
            Your ad introduces the message and invites people to learn more.
            Avoid misleading claims or unsupported promises.
          </Text>
        </View>

        <View style={styles.field}>
          <FieldLabel required>Ad headline</FieldLabel>
          <FormInput
            value={form.adHeadline}
            onChangeText={(value) => update("adHeadline", value)}
            placeholder="A short, attention-grabbing headline"
            maxLength={80}
            error={errors.adHeadline}
          />
          <Text style={styles.characterCount}>
            {form.adHeadline.length}/80 characters
          </Text>
        </View>

        <View style={styles.field}>
          <FieldLabel required>Ad description</FieldLabel>
          <FormInput
            value={form.adDescription}
            onChangeText={(value) => update("adDescription", value)}
            placeholder="Give people a reason to learn more..."
            multiline
            numberOfLines={4}
            error={errors.adDescription}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel hint="Upload from your device or leave blank to use the cover image.">
            Advertising image
          </FieldLabel>
          <FormInput
            value={form.adImageUrl}
            onChangeText={(value) => update("adImageUrl", value)}
            placeholder="https://example.com/ad-image.jpg"
            keyboardType="url"
            autoCapitalize="none"
            error={errors.adImageUrl}
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => pickCampaignImage("ad")}
            activeOpacity={0.8}
            style={styles.imageUploadButton}
            disabled={uploadingImage || useDummyImage}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={C.primary} />
            <Text style={styles.imageUploadButtonText}>
              Upload ad image from device
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <FieldLabel>Call-to-action label</FieldLabel>
          <View style={styles.chipWrap}>
            {["Learn More", "Read the Story", "Get Involved", "Explore"].map(
              (label) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => update("adCta", label)}
                  style={[
                    styles.chip,
                    form.adCta === label && styles.chipSelected,
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.adCta === label && styles.chipTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <SectionTitle
          title="Ad preview"
          description="An illustrative preview of how your message could appear."
        />

        <View style={styles.adPreview}>
          <View style={styles.adPreviewLabel}>
            <Ionicons name="megaphone-outline" size={15} color={C.muted} />
            <Text style={styles.adPreviewLabelText}>SPONSORED · PREVIEW</Text>
          </View>

          <Image
            source={{
              uri: useDummyImage
                ? DEFAULT_COVER
                : form.adImageUrl.trim()
                  ? form.adImageUrl.trim()
                  : form.imageUrl.trim()
                    ? form.imageUrl.trim()
                    : DEFAULT_COVER,
            }}
            style={styles.adPreviewImage}
            resizeMode="cover"
          />

          <View style={styles.adPreviewContent}>
            <Text style={styles.adPreviewTitle}>
              {form.adHeadline.trim() || form.title || "Your campaign headline"}
            </Text>
            <Text style={styles.adPreviewDescription}>
              {form.adDescription.trim() ||
                "Your ad description will appear here."}
            </Text>
            <View style={styles.adPreviewFooter}>
              <Text style={styles.adPreviewBrand}>
                {form.creatorName || "Your organization"}
              </Text>
              <View style={styles.previewCta}>
                <Text style={styles.previewCtaText}>
                  {form.adCta || "Learn More"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </>
    );
  }

  function renderReach() {
    return (
      <>
        <SectionTitle
          title="Plan your reach"
          description="Choose where and how you want your message to be distributed."
        />

        <View style={styles.field}>
          <FieldLabel hint="Separate locations with commas. Final targeting may change during review.">
            Target locations
          </FieldLabel>
          <FormInput
            value={form.targetLocations}
            onChangeText={(value) => update("targetLocations", value)}
            placeholder="India, Maharashtra, Mumbai"
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel hint="Separate interests with commas.">
            Audience interests
          </FieldLabel>
          <FormInput
            value={form.audienceInterests}
            onChangeText={(value) => update("audienceInterests", value)}
            placeholder="Education, climate, public policy"
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel required>Distribution channels</FieldLabel>
          <View style={styles.channelList}>
            {CHANNELS.map((channel, index) => {
              const selected = form.distributionChannels.includes(channel);
              const icons: React.ComponentProps<typeof Ionicons>["name"][] = [
                "share-social-outline",
                "desktop-outline",
                "play-circle-outline",
                "search-outline",
              ];

              return (
                <TouchableOpacity
                  key={channel}
                  onPress={() => {
                    const channels = selected
                      ? form.distributionChannels.filter(
                          (item) => item !== channel,
                        )
                      : [...form.distributionChannels, channel];

                    update("distributionChannels", channels);
                  }}
                  activeOpacity={0.75}
                  style={[
                    styles.channelRow,
                    selected && styles.channelRowSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.channelIcon,
                      selected && styles.channelIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={icons[index]}
                      size={20}
                      color={selected ? C.primary : C.muted}
                    />
                  </View>
                  <View style={styles.channelCopy}>
                    <Text style={styles.channelTitle}>{channel}</Text>
                    <Text style={styles.channelDescription}>
                      {
                        [
                          "Reach audiences on social platforms",
                          "Promote the message on supported websites",
                          "Use video placements where available",
                          "Help interested audiences find the message",
                        ][index]
                      }
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? "checkbox" : "square-outline"}
                    size={22}
                    color={selected ? C.primary : "#94A3B8"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          {renderError("distributionChannels")}
        </View>

        <View style={styles.divider} />

        <SectionTitle
          title="Budget and duration"
          description="Set your funding target and explain how much you plan to spend on promotion. Reach is only an estimate."
        />

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={C.primary}
          />
          <Text style={styles.infoText}>
            Your funding goal is the total amount you aim to raise. Your
            advertising budget is the portion planned for paid promotion. Any
            remaining amount may cover platform fees or other approved
            distribution costs under the platform's funding policy.
          </Text>
        </View>

        <View style={styles.field}>
          <FieldLabel
            required
            hint="The total amount you want to raise from supporters to distribute your message—not a donation to the cause itself."
          >
            Funding goal (USD)
          </FieldLabel>
          <FormInput
            value={form.goal}
            onChangeText={(value) => update("goal", value)}
            placeholder="e.g. 5000"
            keyboardType="decimal-pad"
            error={errors.goal}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel
            required
            hint="The portion of your funding goal planned for paid promotion, such as social media or display ads. It is not paid directly to you."
          >
            Advertising budget (USD)
          </FieldLabel>
          <FormInput
            value={form.adBudget}
            onChangeText={(value) => update("adBudget", value)}
            placeholder="e.g. 3500"
            keyboardType="decimal-pad"
            error={errors.adBudget}
          />
          {form.goal && form.adBudget ? (
            <View style={styles.budgetSummary}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Funding goal</Text>
                <Text style={styles.summaryValue}>{money(form.goal)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Planned ad budget</Text>
                <Text style={styles.summaryValue}>{money(form.adBudget)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>
                  Remaining for fees and other approved costs
                </Text>
                <Text style={styles.summaryValue}>
                  {money(
                    Math.max(0, Number(form.goal) - Number(form.adBudget)),
                  )}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.field}>
          <FieldLabel
            required
            hint="How long should your campaign run before its planned promotion period ends?"
          >
            Promotion duration (days)
          </FieldLabel>
          <View style={styles.durationRow}>
            {[7, 14, 30, 60, 90].map((days) => (
              <TouchableOpacity
                key={days}
                onPress={() => update("campaignDurationDays", String(days))}
                style={[
                  styles.durationOption,
                  form.campaignDurationDays === String(days) &&
                    styles.durationOptionSelected,
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.durationText,
                    form.campaignDurationDays === String(days) &&
                      styles.durationTextSelected,
                  ]}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FormInput
            value={form.campaignDurationDays}
            onChangeText={(value) => update("campaignDurationDays", value)}
            placeholder="Or enter 1–365 days"
            keyboardType="numeric"
            error={errors.campaignDurationDays}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel hint="Optional. Leave blank to use the illustrative estimate.">
            Estimated audience reach
          </FieldLabel>
          <FormInput
            value={form.estimatedReach}
            onChangeText={(value) => update("estimatedReach", value)}
            placeholder="e.g. 50000"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.reachCard}>
          <View style={styles.reachIcon}>
            <Ionicons name="people" size={23} color={C.primary} />
          </View>
          <View style={styles.reachCopy}>
            <Text style={styles.reachLabel}>Illustrative estimated reach</Text>
            <Text style={styles.reachNumber}>
              {reachEstimate > 0
                ? reachEstimate.toLocaleString("en-US")
                : "Not estimated yet"}
            </Text>
            <Text style={styles.reachNote}>
              This is not a guarantee. Actual delivery depends on advertising
              prices, inventory, targeting and performance.
            </Text>
          </View>
        </View>
      </>
    );
  }

  function renderSubmit() {
    const completeSources = form.sources.filter(
      (source) => source.title.trim() || source.url.trim(),
    );

    return (
      <>
        <SectionTitle
          title="Review your campaign"
          description="Check the details below before submitting your campaign for review."
        />

        <View style={styles.reviewHero}>
          <Image
            source={{
              uri: useDummyImage
                ? DEFAULT_COVER
                : form.imageUrl.trim()
                  ? form.imageUrl.trim()
                  : DEFAULT_COVER,
            }}
            style={styles.reviewImage}
            resizeMode="cover"
          />
          <View style={styles.reviewHeroContent}>
            <View style={styles.reviewCategory}>
              <Text style={styles.reviewCategoryText}>
                {form.category || "Campaign"}
              </Text>
            </View>
            <Text style={styles.reviewTitle}>
              {form.title || "Untitled campaign"}
            </Text>
            <Text style={styles.reviewCreator}>
              Created by {form.creatorName || "Your organization"}
            </Text>
            <Text style={styles.reviewSummary}>
              {form.description || "No summary added yet."}
            </Text>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="book-outline" size={19} color={C.primary} />
            <Text style={styles.reviewCardTitle}>Story and evidence</Text>
          </View>
          <Text style={styles.reviewHeadline}>
            {form.storyHeadline || "No story headline"}
          </Text>
          <Text style={styles.reviewBody}>
            {form.storyIntro || "No story introduction added."}
          </Text>

          {form.storySections
            .filter((section) => section.heading.trim() || section.body.trim())
            .map((section, index) => (
              <View
                key={`review-section-${index}`}
                style={styles.reviewSection}
              >
                {section.heading.trim() ? (
                  <Text style={styles.reviewSectionHeading}>
                    {section.heading}
                  </Text>
                ) : null}
                {section.body.trim() ? (
                  <Text style={styles.reviewBody}>{section.body}</Text>
                ) : null}
              </View>
            ))}

          <Text style={styles.reviewMeta}>
            {completeSources.length} supporting source
            {completeSources.length === 1 ? "" : "s"} added
          </Text>

          {completeSources.map((source, index) => (
            <View key={`review-source-${index}`} style={styles.sourcePreview}>
              <Ionicons name="link-outline" size={15} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceTitle}>
                  {source.title || source.url}
                </Text>
                {source.url ? (
                  <Text style={styles.sourceUrl}>{source.url}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="images-outline" size={19} color={C.primary} />
            <Text style={styles.reviewCardTitle}>Advertising creative</Text>
          </View>
          <Text style={styles.reviewHeadline}>
            {form.adHeadline || "No ad headline"}
          </Text>
          <Text style={styles.reviewBody}>
            {form.adDescription || "No ad description added."}
          </Text>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewMeta}>Call to action</Text>
            <Text style={styles.reviewValue}>{form.adCta || "Learn More"}</Text>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewCardHeader}>
            <Ionicons name="people-outline" size={19} color={C.primary} />
            <Text style={styles.reviewCardTitle}>
              Audience and distribution
            </Text>
          </View>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewMeta}>Locations</Text>
            <Text style={styles.reviewValue}>
              {form.targetLocations.trim() || "To be finalized in review"}
            </Text>
          </View>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewMeta}>Interests</Text>
            <Text style={styles.reviewValue}>
              {form.audienceInterests.trim() || "Not specified"}
            </Text>
          </View>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewMeta}>Channels</Text>
            <Text style={styles.reviewValue}>
              {form.distributionChannels.join(", ") || "None selected"}
            </Text>
          </View>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewMeta}>Duration</Text>
            <Text style={styles.reviewValue}>
              {form.campaignDurationDays} days
            </Text>
          </View>
          <View style={styles.reviewMetaRow}>
            <Text style={styles.reviewMeta}>Estimated reach</Text>
            <Text style={styles.reviewValue}>
              {reachEstimate > 0
                ? reachEstimate.toLocaleString("en-US")
                : "Not estimated"}
            </Text>
          </View>
        </View>

        <View style={styles.fundingReview}>
          <Text style={styles.fundingReviewEyebrow}>FUNDING PLAN</Text>
          <View style={styles.fundingReviewMain}>
            <View>
              <Text style={styles.fundingReviewLabel}>Funding goal</Text>
              <Text style={styles.fundingReviewAmount}>{money(form.goal)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.fundingReviewLabel}>Ad budget</Text>
              <Text style={styles.fundingReviewAmount}>
                {money(form.adBudget)}
              </Text>
            </View>
          </View>
          <View style={styles.fundingBar}>
            <View
              style={[
                styles.fundingBarFill,
                {
                  width: `${
                    Number(form.goal) > 0
                      ? Math.min(
                          100,
                          (Number(form.adBudget) / Number(form.goal)) * 100,
                        )
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.fundingFootnote}>
            Contributions fund message distribution, not direct donations to a
            cause. Final allocation and fees are subject to review and the
            applicable terms.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAcceptedTerms((value) => !value)}
          style={styles.termsRow}
        >
          <View
            style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
          >
            {acceptedTerms ? (
              <Ionicons name="checkmark" size={15} color={C.white} />
            ) : null}
          </View>
          <Text style={styles.termsText}>
            I confirm that the information and sources provided are accurate to
            the best of my knowledge, and that this campaign follows the
            platform's submission rules.
          </Text>
        </TouchableOpacity>
        {renderError("terms")}

        <View style={styles.infoBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={C.primary}
          />
          <Text style={styles.infoText}>
            Submission does not mean approval. Your campaign will enter review
            before it becomes available for funding or distribution.
          </Text>
        </View>
      </>
    );
  }

  function renderStepContent() {
    switch (step) {
      case 0:
        return renderBasics();
      case 1:
        return renderStory();
      case 2:
        return renderAdVisuals();
      case 3:
        return renderReach();
      default:
        return renderSubmit();
    }
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <CommonHeader />

        <View style={styles.loggedOutContent}>
          <View style={styles.loggedOutCard}>
            <View style={styles.loggedOutIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={27}
                color={C.primary}
              />
            </View>
            <Text style={styles.loggedOutTitle}>Login to access this page</Text>
            <TouchableOpacity
              accessibilityRole="link"
              activeOpacity={0.75}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.loggedOutLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CommonHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          compact && styles.scrollContentCompact,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { maxWidth: 760 }]}>
          <View style={styles.pageIntro}>
            <Text style={styles.eyebrow}>CAMPAIGN STUDIO</Text>
            <Text style={styles.pageTitle}>Create a campaign</Text>
            <Text style={styles.pageSubtitle}>
              Turn an important message into a campaign built to reach more
              people.
            </Text>
          </View>

          {drafts.length > 0 ? (
            <View style={styles.draftsCard}>
              <TouchableOpacity
                onPress={() => setShowDrafts((value) => !value)}
                style={styles.draftsHeader}
                activeOpacity={0.75}
              >
                <View style={styles.draftsHeaderLeft}>
                  <View style={styles.draftsIcon}>
                    <Ionicons
                      name="folder-open-outline"
                      size={19}
                      color={C.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.draftsTitle}>Your saved drafts</Text>
                    <Text style={styles.draftsSubtitle}>
                      {drafts.length} draft{drafts.length === 1 ? "" : "s"}{" "}
                      saved on this device
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showDrafts ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={C.muted}
                />
              </TouchableOpacity>

              {showDrafts ? (
                <View style={styles.draftsList}>
                  {drafts.map((draft) => (
                    <View key={draft.id} style={styles.draftRow}>
                      <View style={styles.draftFileIcon}>
                        <Ionicons
                          name="document-text-outline"
                          size={20}
                          color={C.muted}
                        />
                      </View>
                      <View style={styles.draftInfo}>
                        <Text style={styles.draftName} numberOfLines={1}>
                          {draft.title || "Untitled campaign"}
                        </Text>
                        <Text style={styles.draftDate}>
                          Updated{" "}
                          {new Date(draft.updatedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => resumeDraft(draft)}
                        style={styles.resumeButton}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.resumeButtonText}>Resume</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityLabel={`Delete ${draft.title || "draft"}`}
                        onPress={() => confirmDeleteDraft(draft)}
                        style={styles.deleteDraftButton}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={C.red}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.stepperCard}>
            <View style={styles.stepperTop}>
              <Text style={styles.stepperEyebrow}>YOUR PROGRESS</Text>
              <Text style={styles.stepperCount}>
                STEP {step + 1} OF {STEPS.length}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <View style={styles.stepperItems}>
              {STEPS.map((item, index) => {
                const active = step === index;
                const complete = step > index;

                return (
                  <TouchableOpacity
                    key={item.title}
                    onPress={() => {
                      if (index < step) {
                        setErrors({});
                        setStep(index);
                      }
                    }}
                    activeOpacity={index < step ? 0.7 : 1}
                    style={styles.stepperItem}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        active && styles.stepCircleActive,
                        complete && styles.stepCircleComplete,
                      ]}
                    >
                      {complete ? (
                        <Ionicons name="checkmark" size={17} color={C.white} />
                      ) : (
                        <Ionicons
                          name={item.icon}
                          size={17}
                          color={active ? C.white : C.muted}
                        />
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.stepLabel,
                        active && styles.stepLabelActive,
                        complete && styles.stepLabelComplete,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <View style={styles.formStepIcon}>
                <Ionicons name={STEPS[step].icon} size={23} color={C.primary} />
              </View>
              <View style={styles.formStepCopy}>
                <Text style={styles.formStepTitle}>{STEPS[step].title}</Text>
                <Text style={styles.formStepSubtitle}>
                  {STEPS[step].subtitle}
                </Text>
              </View>
              {step < 4 ? (
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>STEP {step + 1}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.formDivider} />

            {renderStepContent()}

            <View style={styles.bottomActions}>
              <TouchableOpacity
                onPress={handleSaveDraft}
                disabled={saving || draftsLoading || submitting}
                activeOpacity={0.8}
                style={[
                  styles.saveDraftButton,
                  (saving || draftsLoading || submitting) &&
                    styles.disabledButton,
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <Ionicons
                    name="bookmark-outline"
                    size={19}
                    color={C.primary}
                  />
                )}
                <Text style={styles.saveDraftButtonText}>
                  {saving ? "Saving draft..." : "Save as Draft"}
                </Text>
              </TouchableOpacity>

              <View style={styles.navigationButtons}>
                {step > 0 ? (
                  <TouchableOpacity
                    onPress={handleBack}
                    disabled={submitting}
                    activeOpacity={0.8}
                    style={styles.backButton}
                  >
                    <Ionicons name="arrow-back" size={18} color={C.text} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                ) : null}

                {step < 4 ? (
                  <TouchableOpacity
                    onPress={handleContinue}
                    activeOpacity={0.85}
                    style={[
                      styles.continueButton,
                      step === 0 && styles.continueButtonCentered,
                    ]}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color={C.white} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                    style={[
                      styles.continueButton,
                      styles.submitButton,
                      submitting && styles.disabledButton,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <Ionicons
                        name="paper-plane-outline"
                        size={18}
                        color={C.white}
                      />
                    )}
                    <Text style={styles.continueButtonText}>
                      {submitting ? "Submitting..." : "Submit for Review"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.footerHint}>
                {step < 4
                  ? "Your progress is preserved as you move between steps."
                  : "Your campaign will be reviewed before it becomes available for funding."}
              </Text>
            </View>
          </View>

          <View style={styles.pageFooter}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={C.muted}
            />
            <Text style={styles.pageFooterText}>
              Transparent funding. Responsible amplification.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.successModalScroll}
            contentContainerStyle={styles.successModalScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.successModal}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={43} color={C.green} />
              </View>
              <Text style={styles.successTitle}>Campaign submitted</Text>
              <Text style={styles.successMessage}>
                Your campaign has been submitted for review. You can follow its
                status and future updates from your profile and activity feed.
              </Text>

              <View style={styles.reviewTimeline}>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineIconDone}>
                    <Ionicons name="checkmark" size={15} color={C.white} />
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineTitle}>Campaign submitted</Text>
                    <Text style={styles.timelineDescription}>
                      Your information has been received.
                    </Text>
                  </View>
                </View>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineRow}>
                  <View style={styles.timelineIconPending}>
                    <Ionicons
                      name="search-outline"
                      size={15}
                      color={C.primary}
                    />
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineTitle}>Content review</Text>
                    <Text style={styles.timelineDescription}>
                      The campaign awaits review.
                    </Text>
                  </View>
                </View>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineRow}>
                  <View style={styles.timelineIconPending}>
                    <Ionicons
                      name="megaphone-outline"
                      size={15}
                      color={C.primary}
                    />
                  </View>
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineTitle}>
                      Ready for amplification
                    </Text>
                    <Text style={styles.timelineDescription}>
                      Eligible campaigns can proceed after approval.
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.successPrimaryButton}
                activeOpacity={0.85}
                onPress={() => {
                  setShowSuccess(false);
                  router.replace("/(tabs)/profile");
                }}
              >
                <Text style={styles.successPrimaryButtonText}>
                  View My Campaigns
                </Text>
                <Ionicons name="arrow-forward" size={18} color={C.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successSecondaryButton}
                activeOpacity={0.8}
                onPress={() => {
                  setShowSuccess(false);
                  resetForm();
                }}
              >
                <Text style={styles.successSecondaryButtonText}>
                  Create another campaign
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  loggedOutContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  loggedOutCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  loggedOutIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loggedOutTitle: {
    color: C.heading,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 15,
  },
  loggedOutLink: {
    color: C.primary,
    fontSize: 15,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  scrollContentCompact: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  stickyHeaderWrap: {
    width: "100%",
    alignSelf: "center",
    maxWidth: 760,
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: C.white,
    zIndex: 10,
  },
  stickyHeaderWrapCompact: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  page: {
    width: "100%",
    alignSelf: "center",
  },
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
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: C.heading,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  navigationOverlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  navigationBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  navigationPanel: {
    width: "86%",
    maxWidth: 360,
    height: "100%",
    backgroundColor: C.white,
    paddingTop: Platform.OS === "ios" ? 56 : 30,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  navigationPanelHeader: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 15,
  },
  navigationCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.subtle,
  },
  navigationItem: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.subtle,
  },
  navigationItemText: {
    flex: 1,
    color: C.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  brandCaption: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 3,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  draftStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
  },
  draftStatusText: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
  },
  pageIntro: {
    marginBottom: 22,
  },
  eyebrow: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 9,
  },
  pageTitle: {
    fontSize: 31,
    lineHeight: 38,
    color: C.heading,
    fontWeight: "800",
    letterSpacing: -1,
  },
  pageSubtitle: {
    marginTop: 8,
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 560,
  },
  draftsCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
    overflow: "hidden",
  },
  draftsHeader: {
    minHeight: 78,
    paddingHorizontal: 17,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  draftsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  draftsIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  draftsTitle: {
    color: C.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  draftsSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  draftsList: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 15,
  },
  draftRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.subtle,
  },
  draftFileIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: C.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  draftInfo: {
    flex: 1,
    minWidth: 0,
  },
  draftName: {
    color: C.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  draftDate: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  resumeButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
  },
  resumeButtonText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  deleteDraftButton: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: C.redLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperCard: {
    paddingHorizontal: 19,
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    marginBottom: 18,
  },
  stepperTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepperEyebrow: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  stepperCount: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: C.subtle,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.primary,
    borderRadius: 5,
  },
  stepperItems: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 3,
  },
  stepperItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.subtle,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepCircleActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  stepCircleComplete: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  stepLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  stepLabelActive: {
    color: C.primary,
    fontWeight: "800",
  },
  stepLabelComplete: {
    color: C.green,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.025,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 21,
  },
  formStepIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  formStepCopy: {
    flex: 1,
  },
  formStepTitle: {
    color: C.heading,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  formStepSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  optionalBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: C.subtle,
  },
  optionalBadgeText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  formDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 25,
  },
  sectionTitleBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: C.heading,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  field: {
    marginBottom: 21,
  },
  fieldLast: {
    marginBottom: 0,
  },
  labelBlock: {
    marginBottom: 9,
  },
  label: {
    color: C.heading,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  required: {
    color: C.red,
  },
  hint: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  input: {
    width: "100%",
    minHeight: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.heading,
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 13,
    lineHeight: 21,
  },
  inputError: {
    borderColor: C.red,
    backgroundColor: "#FFFAFA",
  },
  errorText: {
    color: C.red,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  characterCount: {
    color: C.muted,
    textAlign: "right",
    fontSize: 10,
    marginTop: 5,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.white,
    maxWidth: "100%",
  },
  chipSelected: {
    backgroundColor: C.primaryLight,
    borderColor: "#A5B4FC",
  },
  chipText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: C.primary,
    fontWeight: "800",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 5,
    marginBottom: 21,
  },
  infoText: {
    flex: 1,
    color: "#3730A3",
    fontSize: 12,
    lineHeight: 19,
  },
  coverPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: C.subtle,
  },
  imageUploadButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 11,
    backgroundColor: C.primaryLight,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imageUploadButtonText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  imageCheckboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginTop: 13,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  imageCheckboxCopy: {
    flex: 1,
  },
  imageCheckboxTitle: {
    color: C.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  imageCheckboxHint: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 25,
  },
  nestedCard: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FBFCFE",
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
  },
  nestedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
    gap: 8,
  },
  nestedCardTitle: {
    color: C.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  smallAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 2,
    marginBottom: 13,
  },
  smallActionText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  adPreview: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: C.white,
    marginBottom: 8,
  },
  adPreviewLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  adPreviewLabelText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  adPreviewImage: {
    width: "100%",
    height: 190,
    backgroundColor: C.subtle,
  },
  adPreviewContent: {
    padding: 15,
  },
  adPreviewTitle: {
    color: C.heading,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
  },
  adPreviewDescription: {
    color: C.text,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
  adPreviewFooter: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  adPreviewBrand: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  previewCta: {
    backgroundColor: C.primary,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  previewCtaText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "800",
  },
  channelList: {
    gap: 10,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    gap: 11,
  },
  channelRowSelected: {
    backgroundColor: "#F8F8FF",
    borderColor: "#A5B4FC",
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  channelIconSelected: {
    backgroundColor: C.primaryLight,
  },
  channelCopy: {
    flex: 1,
  },
  channelTitle: {
    color: C.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  channelDescription: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  budgetSummary: {
    backgroundColor: C.subtle,
    borderRadius: 12,
    padding: 13,
    marginTop: 12,
    gap: 11,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryLabel: {
    color: C.muted,
    fontSize: 11,
    flex: 1,
  },
  summaryValue: {
    color: C.heading,
    fontSize: 12,
    fontWeight: "800",
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  durationOption: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.white,
  },
  durationOptionSelected: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  durationText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
  },
  durationTextSelected: {
    color: C.primary,
    fontWeight: "800",
  },
  reachCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#F5F7FF",
    borderRadius: 15,
    padding: 16,
    marginTop: 4,
  },
  reachIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  reachCopy: {
    flex: 1,
  },
  reachLabel: {
    color: C.text,
    fontSize: 11,
    fontWeight: "700",
  },
  reachNumber: {
    color: C.primary,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  reachNote: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  reviewHero: {
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  reviewImage: {
    width: "100%",
    height: 200,
    backgroundColor: C.subtle,
  },
  reviewHeroContent: {
    padding: 16,
  },
  reviewCategory: {
    alignSelf: "flex-start",
    borderRadius: 7,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 10,
  },
  reviewCategoryText: {
    color: C.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  reviewTitle: {
    color: C.heading,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
  },
  reviewCreator: {
    color: C.muted,
    fontSize: 12,
    marginTop: 7,
  },
  reviewSummary: {
    color: C.text,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: C.white,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 14,
  },
  reviewCardTitle: {
    color: C.heading,
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  reviewHeadline: {
    color: C.heading,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    marginBottom: 7,
  },
  reviewBody: {
    color: C.text,
    fontSize: 12,
    lineHeight: 20,
  },
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: C.subtle,
    marginTop: 13,
    paddingTop: 13,
  },
  reviewSectionHeading: {
    color: C.heading,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  reviewMeta: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
  sourcePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 11,
  },
  sourceTitle: {
    color: C.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  sourceUrl: {
    color: C.primary,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },
  reviewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 12,
  },
  reviewValue: {
    color: C.heading,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  fundingReview: {
    borderRadius: 15,
    backgroundColor: "#111827",
    padding: 18,
    marginBottom: 19,
  },
  fundingReviewEyebrow: {
    color: "#A5B4FC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 17,
  },
  fundingReviewMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 16,
  },
  fundingReviewLabel: {
    color: "#CBD5E1",
    fontSize: 11,
  },
  fundingReviewAmount: {
    color: C.white,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 5,
  },
  fundingBar: {
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 6,
    overflow: "hidden",
  },
  fundingBarFill: {
    height: "100%",
    backgroundColor: "#818CF8",
    borderRadius: 6,
  },
  fundingFootnote: {
    color: "#CBD5E1",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 14,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  termsText: {
    color: C.text,
    fontSize: 12,
    lineHeight: 19,
    flex: 1,
  },
  bottomActions: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 29,
    paddingTop: 21,
  },
  saveDraftButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: C.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 15,
  },
  saveDraftButtonText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  navigationButtons: {
    width: "100%",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  continueButton: {
    minHeight: 50,
    flex: 1,
    maxWidth: 330,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
    shadowColor: C.primary,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  continueButtonCentered: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "100%",
    width: "100%",
    maxWidth: 330,
    alignSelf: "center",
  },
  continueButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },
  backButton: {
    minHeight: 50,
    minWidth: 92,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backButtonText: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: C.green,
    shadowColor: C.green,
  },
  disabledButton: {
    opacity: 0.55,
  },
  footerHint: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 14,
  },
  pageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingTop: 22,
    paddingBottom: 8,
  },
  pageFooterText: {
    color: C.muted,
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  successModalScroll: {
    width: "100%",
    maxWidth: 440,
    flexGrow: 0,
  },
  successModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 8,
  },
  successModal: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },
  successIcon: {
    width: 75,
    height: 75,
    borderRadius: 25,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  successTitle: {
    color: C.heading,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  successMessage: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 23,
  },
  reviewTimeline: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 22,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineIconDone: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineIconPending: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCopy: {
    flex: 1,
  },
  timelineTitle: {
    color: C.heading,
    fontSize: 12,
    fontWeight: "800",
  },
  timelineDescription: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  timelineConnector: {
    height: 19,
    width: 2,
    backgroundColor: C.border,
    marginLeft: 14,
  },
  successPrimaryButton: {
    width: "100%",
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  successPrimaryButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },
  successSecondaryButton: {
    paddingVertical: 15,
    alignItems: "center",
  },
  successSecondaryButtonText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  aiGeneratorCard: {
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 16,
    backgroundColor: "#F8F8FF",
    padding: 16,
    marginBottom: 25,
  },
  aiGeneratorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  aiGeneratorIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  aiGeneratorHeading: {
    flex: 1,
  },
  aiGeneratorTitle: {
    color: C.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  aiGeneratorSubtitle: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  aiPromptInput: {
    width: "100%",
    minHeight: 105,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: C.white,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: C.heading,
    fontSize: 13,
    lineHeight: 20,
  },
  aiGeneratorFooter: {
    marginTop: 11,
    gap: 10,
  },
  aiPromptHint: {
    color: C.muted,
    fontSize: 10,
  },
  aiGenerateButton: {
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 15,
  },
  aiGenerateButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },
  aiDisclaimer: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 11,
  },
});
