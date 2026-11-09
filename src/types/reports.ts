/** Report types the server accepts on create; anything else is a 400 `invalid_type`. */
export type ReportType =
  | "this_month"
  | "last_month"
  | "this_week"
  | "last_week";

export interface ReportSummary {
  id: number;
  type: string;
  type_display: string;
  status: string;
  date: string | null;
  end_date: string | null;
  created_at: string;
  has_pdf: boolean;
}

export interface ReportDetail extends ReportSummary {
  summary: string | null;
  data: Record<string, unknown> | null;
  updated_at: string | null;
  pdf_url: string | null;
}

export interface ReportCreate {
  report_id: number;
  status: string;
  status_url: string;
  task_id: string;
}

export interface AnalysisRequest {
  analysis_id: string;
  url: string;
  status: string;
  status_url: string;
  estimated_time_seconds: number;
}

export interface AnalysisResult {
  analysis_id: string;
  status: string;
  url: string;
  /** Cluster name. */
  cluster: string | null;
  page_id: number | null;
  seo_score: number | null;
  is_orphan: boolean | null;
  depth_from_homepage: number | null;
  /** Result keys are present only when `status` is `completed`; the server does not send these three today. */
  recommended_links?: unknown[] | null;
  recommended_meta?: Record<string, unknown> | null;
  recommended_structured_data?: Record<string, unknown> | null;
  aiso_visibility?: number | null;
  completed_at: string | null;
  /** Present only when `status` is `failed`. */
  error_message?: string | null;
}
