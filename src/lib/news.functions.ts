import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type NewsImpact = "high" | "important" | "moderate" | "low";

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  impact: NewsImpact;
  instruments: string[];
  url: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  impact: NewsImpact;
  instruments: string[];
};

export type NewsFeed = {
  configured: boolean;
  provider: string | null;
  news: NewsItem[];
  calendar: CalendarEvent[];
  error?: string;
};

/** Rough map from event/headline keywords to the futures markets that react. */
const KEYWORD_INSTRUMENTS: { match: RegExp; instruments: string[]; impact: NewsImpact }[] = [
  { match: /\bcpi\b|inflation|pce/i, instruments: ["NQ", "ES", "YM", "GC"], impact: "high" },
  { match: /fomc|fed|rate decision|powell/i, instruments: ["NQ", "ES", "YM", "GC", "ZB"], impact: "high" },
  { match: /non[- ]?farm|payroll|jobs report|unemployment/i, instruments: ["ES", "NQ", "YM"], impact: "high" },
  { match: /crude|oil|opec|inventor(y|ies)/i, instruments: ["CL", "NG"], impact: "important" },
  { match: /gold|bullion/i, instruments: ["GC", "SI"], impact: "moderate" },
  { match: /gdp|retail sales|ism|pmi/i, instruments: ["ES", "NQ"], impact: "important" },
];

export function classifyHeadline(text: string): { impact: NewsImpact; instruments: string[] } {
  for (const rule of KEYWORD_INSTRUMENTS) {
    if (rule.match.test(text)) return { impact: rule.impact, instruments: rule.instruments };
  }
  return { impact: "low", instruments: [] };
}

/**
 * News + economic calendar. The provider key stays server-side; until one is
 * configured the panel renders an honest "not connected" state rather than
 * inventing headlines.
 */
export const getNewsFeed = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20) }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<NewsFeed> => {
    const apiKey = process.env["NEWS_API_KEY"];
    if (!apiKey) {
      return { configured: false, provider: null, news: [], calendar: [] };
    }

    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=${data.limit}`,
        { headers: { "X-Api-Key": apiKey } },
      );
      if (!res.ok) {
        const body = await res.text();
        return {
          configured: true,
          provider: "newsapi",
          news: [],
          calendar: [],
          error: `News provider request failed [${res.status}]: ${body.slice(0, 300)}`,
        };
      }
      const payload = (await res.json()) as {
        articles?: { title?: string; url?: string; publishedAt?: string; source?: { name?: string } }[];
      };
      const news: NewsItem[] = (payload.articles ?? []).map((a, i) => {
        const headline = a.title ?? "Untitled";
        const { impact, instruments } = classifyHeadline(headline);
        return {
          id: `${i}-${a.url ?? headline}`,
          headline,
          source: a.source?.name ?? "Unknown",
          publishedAt: a.publishedAt ?? new Date().toISOString(),
          impact,
          instruments,
          url: a.url ?? null,
        };
      });
      return { configured: true, provider: "newsapi", news, calendar: [] };
    } catch (err) {
      return {
        configured: true,
        provider: "newsapi",
        news: [],
        calendar: [],
        error: err instanceof Error ? err.message : "News request failed",
      };
    }
  });