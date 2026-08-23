export type Brand = {
  id: string;
  name: string;
  website: string;
  logo: string;
  description: string;
  industry: string;
  products: string;
  audience: string;
  valueProposition: string;
  colors: [string, string, string];
  fonts: string;
  voice: string;
  cta: string;
  socials: string;
  competitors: string;
  goals: string;
  bannedPhrases: string;
  notes: string;
  pillars: string[];
};
export type CampaignStatus =
  | "Draft"
  | "In Progress"
  | "Needs Review"
  | "Approved"
  | "Published"
  | "Archived";
export type Campaign = {
  id: string;
  brandId: string;
  name: string;
  product: string;
  offer: string;
  objective: string;
  audience: string;
  platform: string;
  funnel: string;
  tone: string;
  cta: string;
  budget: string;
  dates: string;
  notes: string;
  status: CampaignStatus;
  updatedAt: string;
  creativeIds?: string[];
  dueDate?: string;
};
export type StoryboardScene = {
  id: string;
  beat: string;
  visual: string;
  text: string;
  seconds: string;
};
export type CreativePack = {
  id: string;
  name: string;
  brandId: string;
  goal: string;
  style: string;
  format: string;
  productTitle: string;
  productUrl: string;
  price: string;
  offer: string;
  cta: string;
  description: string;
  assetNames: string[];
  hooks: string[];
  primaryScript: string;
  scriptVariants: string[];
  shots: string[];
  storyboard: StoryboardScene[];
  onScreenText: string[];
  caption: string;
  ctaOptions: string[];
  hashtags: string[];
  headlines: string[];
  variations: Array<{ name: string; hook: string; angle: string; cta: string }>;
  status: "Draft" | "Approved";
  createdAt: string;
  updatedAt: string;
};
export type CalendarItem = {
  id: string;
  creativeId: string;
  title: string;
  date: string;
  platform: string;
  status: "Scheduled" | "Published";
};
export const starterBrands: Brand[] = [
  {
    id: "soliq",
    name: "SOLIQ",
    website: "",
    logo: "",
    description: "Premium innovation brand profile ready for enrichment.",
    industry: "Technology",
    products: "",
    audience: "Design-conscious early adopters",
    valueProposition: "Elegant solutions for modern life",
    colors: ["#ff3f91", "#8b5cf6", "#f5df4d"],
    fonts: "Space Grotesk / Inter",
    voice: "Precise, confident, optimistic",
    cta: "Discover SOLIQ",
    socials: "",
    competitors: "",
    goals: "Awareness, demand generation",
    bannedPhrases: "",
    notes: "Starter profile — complete before launch.",
    pillars: ["Innovation", "Clarity", "Modern living"],
  },
  {
    id: "whattaprice",
    name: "WhattAPrice",
    website: "",
    logo: "",
    description: "Value-led commerce brand profile ready for enrichment.",
    industry: "Commerce",
    products: "",
    audience: "Smart, deal-conscious shoppers",
    valueProposition: "Make every purchase feel like a win",
    colors: ["#ff5d8f", "#6d5dfc", "#42d3b0"],
    fonts: "Space Grotesk / Inter",
    voice: "Energetic, useful, human",
    cta: "See the deal",
    socials: "",
    competitors: "",
    goals: "Sales, affiliate growth",
    bannedPhrases: "",
    notes: "Starter profile — complete before launch.",
    pillars: ["Value", "Discovery", "Smart shopping"],
  },
];
export const campaignObjectives = [
  "Brand Awareness",
  "Traffic",
  "Sales",
  "Product Promotion",
  "Lead Generation",
  "Launch",
  "Retargeting",
  "Engagement",
  "App Promotion",
  "Affiliate Referral",
];
export const conceptAngles = [
  "Problem → Solution",
  "Before / After",
  "Product Feature",
  "Benefit Focus",
  "Urgency",
  "Social Proof",
  "Educational",
  "Comparison",
  "Founder Story",
  "Lifestyle",
  "Minimal Premium",
  "FOMO",
  "Deal / Discount",
  "Launch",
];
export const platforms = [
  "TikTok",
  "Instagram",
  "Facebook",
  "YouTube",
  "Google Ads",
  "X",
  "LinkedIn",
  "Pinterest",
];
const STORE = "aethron-studio-v1";
export type StudioState = {
  brands: Brand[];
  campaigns: Campaign[];
  referrals: Array<{
    id: string;
    advertiser: string;
    url: string;
    source: string;
    status: string;
    estimated: string;
    actual: string;
  }>;
  briefs: Array<Record<string, string>>;
  creatives: CreativePack[];
  calendar: CalendarItem[];
  savedStyles: string[];
};
export const initialState: StudioState = {
  brands: starterBrands,
  campaigns: [],
  referrals: [],
  briefs: [],
  creatives: [],
  calendar: [],
  savedStyles: ["UGC", "Product Demo", "Direct Response"],
};
export function loadStudio(): StudioState {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
    return {
      ...initialState,
      ...saved,
      brands: saved.brands?.length ? saved.brands : starterBrands,
      creatives: saved.creatives || [],
      calendar: saved.calendar || [],
      savedStyles: saved.savedStyles || initialState.savedStyles,
    };
  } catch {
    return initialState;
  }
}
export function saveStudio(state: StudioState) {
  if (typeof window !== "undefined") localStorage.setItem(STORE, JSON.stringify(state));
}
export interface WebsiteExtractionService {
  scan(url: string): Promise<{
    brand: Partial<Brand>;
    products: string[];
    offer?: string;
    audience?: string;
    style?: string;
    angles: string[];
  }>;
}
export interface CreativeAIService {
  developCampaign(input: Campaign): Promise<{
    concept: string;
    hooks: string[];
    messages: string[];
    directions: string[];
    tests: string[];
  }>;
}
export interface ImageGenerationService {
  generate(prompt: string): Promise<{ assetUrl: string }>;
}
export interface AnalyticsProvider {
  report(campaignIds: string[], range: { from: string; to: string }): Promise<unknown>;
}
export interface ClientWorkspaceProvider {
  provision(name: string): Promise<{ id: string }>;
}
export interface BillingProvider {
  getUsage(): Promise<{ credits: number; plan: string }>;
}
export interface VideoGenerationService {
  generate(input: {
    duration: 5 | 10 | 15;
    format: "9:16" | "16:9" | "1:1";
    scenes: unknown[];
  }): Promise<{ jobId: string }>;
}
export interface AdPlatformProvider {
  authorize(): Promise<void>;
  listAdvertisers(): Promise<unknown[]>;
  createCampaign(input: Campaign): Promise<{ id: string }>;
  report(range: { from: string; to: string }): Promise<unknown>;
}
export const integrations = {
  website: false,
  ai: false,
  image: false,
  video: false,
  tiktok: false,
  analytics: false,
  clients: false,
  billing: false,
} as const;
