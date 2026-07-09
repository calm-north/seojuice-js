import { SEOJuiceError } from "./errors.js";
import { HttpClient } from "./http.js";
import { AccessibilityResource } from "./resources/accessibility.js";
import { AISOResource } from "./resources/aiso.js";
import { AnalysisResource } from "./resources/analysis.js";
import { BacklinksResource } from "./resources/backlinks.js";
import { ChangesResource } from "./resources/changes.js";
import { ClustersResource } from "./resources/clusters.js";
import { CompetitorsResource } from "./resources/competitors.js";
import { ContentResource } from "./resources/content.js";
import { GBPResource } from "./resources/gbp.js";
import { IntelligenceResource } from "./resources/intelligence.js";
import { KeywordsResource } from "./resources/keywords.js";
import { LinksResource } from "./resources/links.js";
import { PagesResource } from "./resources/pages.js";
import { ReportsResource } from "./resources/reports.js";
import { SimilarResource } from "./resources/similar.js";
import { WebsitesResource } from "./resources/websites.js";

export interface SEOJuiceConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  fetch?: typeof globalThis.fetch;
  maxRetries?: number;
}

const DEFAULT_BASE_URL = "https://seojuice.com/api/v2";
const DEFAULT_TIMEOUT = 30000;

export class SEOJuice {
  readonly websites: WebsitesResource;
  readonly pages: PagesResource;
  readonly links: LinksResource;
  readonly intelligence: IntelligenceResource;
  readonly clusters: ClustersResource;
  readonly content: ContentResource;
  readonly competitors: CompetitorsResource;
  readonly aiso: AISOResource;
  readonly keywords: KeywordsResource;
  readonly backlinks: BacklinksResource;
  readonly changes: ChangesResource;
  readonly accessibility: AccessibilityResource;
  readonly reports: ReportsResource;
  readonly analysis: AnalysisResource;
  readonly similar: SimilarResource;
  readonly gbp: GBPResource;

  constructor(config: SEOJuiceConfig) {
    const apiKey = config?.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new SEOJuiceError(
        "apiKey is required — pass it to `new SEOJuice({ apiKey })`",
        "authentication_error",
        0,
      );
    }

    const http = new HttpClient({
      baseURL: config.baseURL ?? DEFAULT_BASE_URL,
      apiKey,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      fetch: config.fetch ?? globalThis.fetch.bind(globalThis),
      maxRetries: config.maxRetries,
    });

    this.websites = new WebsitesResource(http);
    this.pages = new PagesResource(http);
    this.links = new LinksResource(http);
    this.intelligence = new IntelligenceResource(http);
    this.clusters = new ClustersResource(http);
    this.content = new ContentResource(http);
    this.competitors = new CompetitorsResource(http);
    this.aiso = new AISOResource(http);
    this.keywords = new KeywordsResource(http);
    this.backlinks = new BacklinksResource(http);
    this.changes = new ChangesResource(http);
    this.accessibility = new AccessibilityResource(http);
    this.reports = new ReportsResource(http);
    this.analysis = new AnalysisResource(http);
    this.similar = new SimilarResource(http);
    this.gbp = new GBPResource(http);
  }
}
