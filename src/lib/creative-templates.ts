import type { Brand, CreativePack } from "./studio-data";

export const goals = [
  "Sales",
  "Website Traffic",
  "Followers",
  "Leads",
  "Product Launch",
  "Awareness",
  "Retargeting",
];
export const formats = [
  "TikTok 9:16",
  "Instagram Reels",
  "YouTube Shorts",
  "Story",
  "Square",
  "Static Ad",
  "Carousel",
];
export const stylePresets = {
  UGC: [
    "I didn't expect this to work…",
    "Conversational and candid",
    "Try it for yourself",
    "Fast, natural cuts",
    "Handheld selfie + close-ups",
  ],
  "Product Demo": [
    "Watch this solve it in seconds",
    "Clear and confident",
    "See it in action",
    "Step-by-step",
    "Macro product details",
  ],
  "Problem / Solution": [
    "Still struggling with [problem]?",
    "Empathetic and direct",
    "Solve it today",
    "Tension then relief",
    "Contrast problem and outcome",
  ],
  "Before / After": [
    "This was me before…",
    "Transformational",
    "Start your transformation",
    "Reveal-led",
    "Matched before/after frames",
  ],
  Testimonial: [
    "Here's what changed for me",
    "Warm and credible",
    "Join happy customers",
    "Measured",
    "Talking head + proof",
  ],
  "Founder Story": [
    "I built this because…",
    "Personal and purposeful",
    "Meet the product",
    "Story-driven",
    "Founder to camera + b-roll",
  ],
  "Meme / Trend": [
    "POV: you finally found it",
    "Playful and current",
    "Get in on it",
    "Quick punchlines",
    "Native trend framing",
  ],
  "Direct Response": [
    "Stop scrolling—this is for you",
    "Urgent and benefit-led",
    "Shop now",
    "Rapid",
    "Bold text + product proof",
  ],
  Luxury: [
    "Designed without compromise",
    "Refined and minimal",
    "Discover the collection",
    "Slow and cinematic",
    "Macro, texture, negative space",
  ],
  "Tech / Futuristic": [
    "The future just arrived",
    "Sharp and visionary",
    "Explore what’s next",
    "Kinetic",
    "Neon UI + dynamic details",
  ],
  Educational: [
    "3 things to know before you buy",
    "Useful and authoritative",
    "Learn more",
    "Structured beats",
    "Presenter + labels",
  ],
  Comparison: [
    "Option A vs the smarter choice",
    "Objective and crisp",
    "Compare the difference",
    "Side-by-side",
    "Split screen + feature callouts",
  ],
  "FOMO / Flash Sale": [
    "You have until midnight",
    "High-energy and urgent",
    "Claim the offer",
    "Countdown-fast",
    "Timer + offer close-ups",
  ],
} as const;

const fill = (value: string, fallback: string) => value.trim() || fallback;
export function generateCreativePack(input: {
  brand: Brand;
  goal: string;
  style: keyof typeof stylePresets;
  format: string;
  productTitle: string;
  productUrl: string;
  price: string;
  offer: string;
  cta: string;
  description: string;
  assetNames?: string[];
}): CreativePack {
  const { brand, goal, style, format } = input;
  const product = fill(input.productTitle, brand.products || "your product");
  const offer = fill(input.offer, brand.valueProposition || "a better way forward");
  const cta = fill(input.cta, brand.cta || "Learn more");
  const [structure, tone, , pacing, shotStyle] = stylePresets[style];
  const hooks = [
    structure.replace("[problem]", `finding the right ${product}`),
    `What if ${product} could change how you ${goal.toLowerCase()}?`,
    `${offer}—without the usual compromise.`,
    `The ${product} detail nobody tells you about.`,
    `Before you scroll: this is made for ${brand.audience || "you"}.`,
  ];
  const primaryScript = `${hooks[0]} Meet ${product} from ${brand.name}. ${input.description || brand.description} ${offer}. ${cta}.`;
  const scriptVariants = [
    `${hooks[1]} Here’s the simple answer: ${product}. Built for ${brand.audience || "people who expect more"}. ${cta}.`,
    `${hooks[2]} See how ${product} turns a familiar problem into a clear win. ${offer}. ${cta}.`,
    `${hooks[3]} One focused product, one compelling result. This is ${product} by ${brand.name}. ${cta}.`,
  ];
  const shots = [
    `0–2s · Hook · ${shotStyle}`,
    `2–5s · Show the problem in context`,
    `5–9s · Demonstrate ${product}`,
    `9–12s · Reveal benefit / proof`,
    `12–15s · Offer card + ${cta}`,
  ];
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: `${brand.name} · ${product} · ${style}`,
    brandId: brand.id,
    goal,
    style,
    format,
    productTitle: product,
    productUrl: input.productUrl,
    price: input.price,
    offer,
    cta,
    description: input.description,
    assetNames: input.assetNames || [],
    hooks,
    primaryScript,
    scriptVariants,
    shots,
    storyboard: shots.map((beat, i) => ({
      id: crypto.randomUUID(),
      beat,
      visual: [
        shotStyle,
        "Show the friction",
        `Hero demo of ${product}`,
        "Proof, reaction, or key benefit",
        `Brand end card in ${brand.colors[0]}`,
      ][i]!,
      text: [hooks[0], "There’s a better way", offer, `Made for ${brand.audience || "you"}`, cta][
        i
      ]!,
      seconds: ["0–2", "2–5", "5–9", "9–12", "12–15"][i]!,
    })),
    onScreenText: [hooks[0], product, offer, input.price, cta].filter(Boolean),
    caption: `${hooks[2]} ${product} by ${brand.name}. ${cta}.`,
    ctaOptions: [cta, "See how it works", "Get the offer", "Discover more"],
    hashtags: ["#YourBrand", "#ProductCategory", "#CampaignTag", "#CreatorTag"],
    headlines: [`Meet ${product}`, offer, `${product}, rethought`],
    variations: [
      { name: "A · Benefit", hook: hooks[0], angle: "Lead with the core benefit", cta },
      {
        name: "B · Proof",
        hook: hooks[3],
        angle: "Lead with demonstration and proof",
        cta: "See it in action",
      },
      {
        name: "C · Offer",
        hook: hooks[2],
        angle: "Lead with offer and urgency",
        cta: "Claim the offer",
      },
    ],
    status: "Draft",
    createdAt: now,
    updatedAt: now,
  };
}
