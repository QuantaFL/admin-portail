/**
 * Model representing a student's report card
 */
export interface ReportCard {
  id: number;
  average_grade: number;
  honors: string;
  path: string;
  pdf_url: string;
  rank: string;
  created_at: string;
  updated_at: string;
  student_session_id: number;
  term_id: number;
}

/**
 * Response from report card generation API
 */
export interface ReportCardGenerationResponse {
  success: boolean;
  message: string;
  report_cards: ReportCard[];
}
