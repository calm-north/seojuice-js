export interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  pagination: Pagination;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export type Period = "7d" | "30d" | "90d";
