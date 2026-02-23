export interface AccessibilityIssue {
  id: number;
  page_url: string | null;
  category: string;
  severity: string;
  wcag_criterion: string | null;
  description: string;
  fix_guidance: string | null;
  element_snippet: string | null;
  auto_fixable: boolean;
  auto_fixed: boolean;
  created_at: string;
}
