/**
 * Intelligence API — Common patterns for SEO data retrieval.
 *
 * Shows how to use the full Intelligence API client for analytics,
 * content workflows, and monitoring.
 */
import { SEOJuice, autoPaginate } from "seojuice";
import type {
  ContentGap,
  ContentDecayAlert,
  IntelligenceSummary,
  SimilarPage,
} from "seojuice";

const client = new SEOJuice({
  apiKey: process.env.SEOJUICE_API_KEY!,
});

// --- SEO Overview ---

async function getSeoOverview(domain: string) {
  const summary = await client.intelligence.getSummary(domain, {
    period: "30d",
    include_trends: true,
    include_history: true,
  });

  return {
    totalPages: summary.total_pages,
    seoScore: summary.seo_score,
    aisoScore: summary.aiso_score,
    trends: summary.trends,
  };
}

// --- Content Gap Analysis ---
// Find topics your competitors rank for but you don't

async function findContentGaps(domain: string): Promise<ContentGap[]> {
  const gaps: ContentGap[] = [];

  for await (const gap of autoPaginate((params) =>
    client.content.listGaps(domain, {
      ...params,
      intent: "informational",
    }),
  )) {
    gaps.push(gap);
  }

  return gaps;
}

// --- Content Decay Detection ---
// Find pages losing traffic that need to be refreshed

async function findDecayingContent(
  domain: string,
): Promise<ContentDecayAlert[]> {
  const alerts: ContentDecayAlert[] = [];

  for await (const alert of autoPaginate((params) =>
    client.content.listDecayAlerts(domain, {
      ...params,
      is_active: true,
      severity: "high",
    }),
  )) {
    alerts.push(alert);
  }

  return alerts;
}

// --- Related Content ---
// Build "Related Posts" sections from similar page data

async function getRelatedPosts(
  domain: string,
  currentUrl: string,
  limit: number = 5,
): Promise<SimilarPage[]> {
  const result = await client.similar.find(domain, {
    url: currentUrl,
    limit,
  });

  return result.similar_pages;
}

// --- Full Workflow ---

async function main() {
  const domain = "example.com";

  // Get overview
  const overview = await getSeoOverview(domain);
  console.log("SEO Overview:", overview);

  // Find content opportunities
  const gaps = await findContentGaps(domain);
  console.log(`Found ${gaps.length} content gaps`);

  // Find pages needing attention
  const decaying = await findDecayingContent(domain);
  console.log(`Found ${decaying.length} decaying pages`);

  // Get related posts for a specific page
  const related = await getRelatedPosts(
    domain,
    `https://${domain}/blog/example-post`,
  );
  console.log("Related posts:", related.map((p) => p.title));

  // PageSpeed for a specific URL
  const speed = await client.intelligence.getPageSpeed(domain, {
    url: `https://${domain}/`,
  });
  console.log("PageSpeed:", speed);

  // Accessibility issues
  const a11y = await client.accessibility.list(domain, {
    severity: "critical",
  });
  console.log(`Critical accessibility issues: ${a11y.pagination.total_count}`);
}

main().catch(console.error);
