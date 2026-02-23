import type { PaginatedResult, PaginationParams } from "./types/common.js";

export class PaginatedResponse<T> {
  readonly results: T[];
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalCount: number;
  readonly pageSize: number;

  constructor(result: PaginatedResult<T>) {
    this.results = result.results;
    this.currentPage = result.pagination.page;
    this.totalPages = result.pagination.total_pages;
    this.totalCount = result.pagination.total_count;
    this.pageSize = result.pagination.page_size;
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }
}

export type PageFetcher<T> = (
  params: PaginationParams,
) => Promise<PaginatedResult<T>>;

export interface AutoPaginateParams extends PaginationParams {
  /** Maximum number of pages to fetch. Defaults to 1000. */
  maxPages?: number;
}

export async function* autoPaginate<T>(
  fetcher: PageFetcher<T>,
  params: AutoPaginateParams = {},
): AsyncGenerator<T, void, undefined> {
  let page = params.page ?? 1;
  const pageSize = params.page_size;
  const maxPages = params.maxPages ?? 1000;

  while (true) {
    const result = await fetcher({ page, page_size: pageSize });

    for (const item of result.results) {
      yield item;
    }

    if (page >= result.pagination.total_pages || page >= maxPages) {
      break;
    }

    page++;
  }
}
