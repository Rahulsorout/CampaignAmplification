import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type CampaignIcon = ComponentProps<typeof Ionicons>["name"];

export type Campaign = {
  id: string;
  category: string;
  title: string;
  creator: string;
  description: string;
  raised: number;
  goal: number;
  daysLeft: number;
  image: string;
  icon: CampaignIcon;
};

export const campaigns: Campaign[] = [
  {
    id: "1",
    category: "Health",
    title: "Clean drinking water in every public school",
    creator: "Marisol Everett",
    description:
      "A district-by-district push to replace lead service lines in public schools. This campaign supports community outreach and amplifies messages that help people understand the issue.",
    raised: 5240,
    goal: 8000,
    daysLeft: 18,
    image:
      "https://images.unsplash.com/photo-1541919329513-35f7af297129?w=900&auto=format&fit=crop&q=80",
    icon: "medkit-outline",
  },
  {
    id: "2",
    category: "Civic",
    title: "Redraw the bus network around where people actually work",
    creator: "Devin Okonkwo",
    description:
      "Most routes still converge downtown, but jobs and communities have moved. Help this campaign reach people interested in improving public transport.",
    raised: 9100,
    goal: 12000,
    daysLeft: 18,
    image:
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=900&auto=format&fit=crop&q=80",
    icon: "business-outline",
  },
  {
    id: "3",
    category: "Consumer",
    title: "Let farmers repair the equipment they own",
    creator: "Hannah Breit",
    description:
      "Software restrictions can prevent farmers from repairing equipment they own. This campaign aims to amplify the right-to-repair discussion.",
    raised: 4300,
    goal: 15000,
    daysLeft: 18,
    image:
      "https://images.unsplash.com/photo-1523742814826-2e0f6f4f5a2b?w=900&auto=format&fit=crop&q=80",
    icon: "cart-outline",
  },
  {
    id: "4",
    category: "Community",
    title: "Keep the winter shelter open past 7am",
    creator: "Ray Alcantara",
    description:
      "Help communities advocate for shelter access throughout the morning and raise awareness of the challenges faced by people experiencing homelessness.",
    raised: 5880,
    goal: 6000,
    daysLeft: 18,
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=900&auto=format&fit=crop&q=80",
    icon: "people-outline",
  },
  {
    id: "5",
    category: "Civic",
    title: "Write ballot measures at a tenth-grade reading level",
    creator: "Priscilla Nwosu",
    description:
      "Make public ballot measures easier for people to understand and participate in civic life.",
    raised: 2100,
    goal: 9000,
    daysLeft: 18,
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&auto=format&fit=crop&q=80",
    icon: "business-outline",
  },
  {
    id: "6",
    category: "Environment",
    title: "Plant the shade where the heat actually is",
    creator: "Tobias Lund",
    description:
      "Support messages advocating for tree planting in neighbourhoods facing the highest temperatures.",
    raised: 7650,
    goal: 11000,
    daysLeft: 18,
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&auto=format&fit=crop&q=80",
    icon: "leaf-outline",
  },
];
