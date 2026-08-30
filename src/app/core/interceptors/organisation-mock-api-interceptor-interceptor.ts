import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';

import { Observable, delay, map, mergeMap, of, throwError } from 'rxjs';

import type {
  ApiErrorResponse,
  OrganisationListApiResponse,
  RawOrganisation,
} from '../../shared/models/organisation.model';

/*
 * ============================================================
 * Mock API configuration
 * ============================================================
 */

const MAX_PAGE_SIZE = 25;

const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 900;

/*
 * Stores timestamps of organisation API requests.
 *
 * We interpret "5 requests per minute" as:
 *
 * Maximum 5 requests inside a rolling 60-second window.
 */
const requestTimestamps: number[] = [];

/*
 * ============================================================
 * Helper: identify organisation API requests
 * ============================================================
 *
 * The component will make requests like:
 *
 * /api/organisations?page=1&pageSize=25
 *
 * But there is no real backend.
 *
 * We will intercept this request and internally redirect it to:
 *
 * /assets/organisations.json
 */

const isOrganisationListRequest = (url: string): boolean =>
  url.toLowerCase().startsWith('/api/organisations');

/*
 * ============================================================
 * Helper: parse positive integer
 * ============================================================
 */

const parsePositiveInteger = (value: string | null, fallback: number): number => {
  if (value === null || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.trunc(parsed);
};

/*
 * ============================================================
 * Helper: parse page size
 * ============================================================
 *
 * The API allows a maximum of 25 records per request.
 *
 * Even if the client asks for:
 *
 * pageSize=100
 *
 * we will only return 25.
 */

const parsePageSize = (value: string | null): number => {
  const requestedPageSize = parsePositiveInteger(value, MAX_PAGE_SIZE);

  return Math.min(requestedPageSize, MAX_PAGE_SIZE);
};

/*
 * ============================================================
 * Helper: random delay
 * ============================================================
 *
 * Generates a random value between 400 and 900 milliseconds.
 */

const getRandomDelay = (): number => {
  return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
};

/*
 * ============================================================
 * Helper: API errors
 * ============================================================
 */

const createServerError = (): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 500,
    statusText: 'Internal Server Error',
    error: {
      message: 'Failed to load organisations',
    } satisfies ApiErrorResponse,
  });

const createRateLimitError = (): HttpErrorResponse =>
  new HttpErrorResponse({
    status: 429,
    statusText: 'Too Many Requests',
    error: {
      message: 'Rate limit exceeded. Please retry later.',
    } satisfies ApiErrorResponse,
  });

/*
 * ============================================================
 * Rate limiting
 * ============================================================
 *
 * Remove timestamps older than 60 seconds.
 *
 * Then check whether we have already reached the limit.
 */

const checkRateLimit = (): void => {
  const now = Date.now();

  /*
   * Remove requests that are outside the rolling
   * 60-second window.
   */
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] >= RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }

  /*
   * If 5 requests already happened within the window,
   * reject this request.
   */
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    throw createRateLimitError();
  }

  /*
   * Record the current request.
   */
  requestTimestamps.push(now);
};

/*
 * ============================================================
 * Search
 * ============================================================
 *
 * Search is performed by our mock API, not by the component.
 *
 * Example:
 *
 * /api/organisations?search=globex
 *
 * will filter the fixture before pagination.
 */

const applySearch = (records: RawOrganisation[], searchValue: string | null): RawOrganisation[] => {
  const search = searchValue?.trim().toLowerCase() ?? '';

  /*
   * No search term means no filtering.
   */
  if (!search) {
    return records;
  }

  return records.filter((record) => {
    /*
     * The fixture contains null/empty names,
     * so handle them safely.
     */
    const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';

    return name.includes(search);
  });
};

/*
 * ============================================================
 * Status filter
 * ============================================================
 *
 * Supported status filters:
 *
 * active
 * inactive
 * suspended
 *
 * Matching is case-insensitive.
 *
 * We intentionally do NOT repair malformed values such as:
 *
 * "actve"
 *
 * because the raw fixture should remain untouched.
 */

const applyStatusFilter = (
  records: RawOrganisation[],
  statusValue: string | null,
): RawOrganisation[] => {
  const status = statusValue?.trim().toLowerCase() ?? '';

  /*
   * No status filter.
   */
  if (!status) {
    return records;
  }

  const supportedStatuses = new Set(['active', 'inactive', 'suspended']);

  /*
   * For now, unsupported status means no filtering.
   *
   * This is our mock API behaviour.
   */
  if (!supportedStatuses.has(status)) {
    return records;
  }

  return records.filter((record) => {
    if (typeof record.status !== 'string') {
      return false;
    }

    return record.status.trim().toLowerCase() === status;
  });
};

/*
 * ============================================================
 * Pagination
 * ============================================================
 *
 * IMPORTANT:
 *
 * Filtering happens BEFORE pagination.
 *
 * raw records
 *      ↓
 * search
 *      ↓
 * status
 *      ↓
 * pagination
 */

const buildPaginatedResponse = (
  records: RawOrganisation[],
  page: number,
  pageSize: number,
): OrganisationListApiResponse => {
  const total = records.length;

  const startIndex = (page - 1) * pageSize;

  const endIndex = startIndex + pageSize;

  const data = records.slice(startIndex, endIndex);

  return {
    data,
    page,
    pageSize,
    total,
    hasNextPage: endIndex < total,
  };
};

/*
 * ============================================================
 * Interceptor
 * ============================================================
 */

export const organisationMockApiInterceptor: HttpInterceptorFn = (req, next) => {
  /*
   * We only want to handle our fake organisation API.
   *
   * Other HTTP requests continue normally.
   */
  if (!isOrganisationListRequest(req.url)) {
    return next(req);
  }

  /*
   * Read query parameters from the original request.
   *
   * Example:
   *
   * /api/organisations
   *   ?page=1
   *   &pageSize=25
   *   &search=globex
   *   &status=active
   */

  const page = parsePositiveInteger(req.params.get('page'), 1);

  const pageSize = parsePageSize(req.params.get('pageSize'));

  const search = req.params.get('search');

  const status = req.params.get('status');

  /*
   * ----------------------------------------------------------
   * Rate limit
   * ----------------------------------------------------------
   *
   * We check the limit before making the underlying
   * asset request.
   */
  try {
    checkRateLimit();
  } catch (error) {
    return throwError(() => error);
  }

  /*
   * ----------------------------------------------------------
   * Redirect the fake API request to our local fixture.
   * ----------------------------------------------------------
   *
   * The component thinks it is calling:
   *
   * /api/organisations
   *
   * But there is no backend.
   *
   * We let Angular's HttpClient request:
   *
   * /assets/organisations.json
   *
   * because the file is already configured as an Angular asset.
   */
  const assetRequest = req.clone({
    url: '/assets/organisations.json',

    /*
     * We don't want the API query parameters to be sent
     * to the static JSON file.
     *
     * Search/filter/pagination are handled below after
     * receiving the complete fixture.
     */
    params: req.params.delete('page').delete('pageSize').delete('search').delete('status'),
  });

  /*
   * ----------------------------------------------------------
   * Let Angular fetch the actual asset.
   * ----------------------------------------------------------
   *
   * This is the important part:
   *
   * next(assetRequest)
   *
   * Angular performs the normal HTTP request and gives
   * us the response as an Observable.
   */
  return next(assetRequest).pipe(
    /*
     * --------------------------------------------------------
     * Simulate network latency.
     * --------------------------------------------------------
     *
     * Every request takes between 400 and 900ms.
     */
    delay(getRandomDelay()),

    /*
     * --------------------------------------------------------
     * Random API failure
     * --------------------------------------------------------
     *
     * Approximately 15% of requests fail.
     */
    mergeMap((event: HttpEvent<unknown>) => {
      if (Math.random() < 0.15) {
        return throwError(() => createServerError());
      }

      return of(event);
    }),

    /*
     * --------------------------------------------------------
     * Process successful response
     * --------------------------------------------------------
     */
    map((event: HttpEvent<unknown>) => {
      /*
       * HttpClient can emit different HttpEvent types.
       *
       * We only want to modify the final HTTP response.
       */
      if (!(event instanceof HttpResponse)) {
        return event;
      }

      /*
       * The asset contains the raw fixture.
       *
       * We don't normalize or modify these records.
       */
      const records = event.body as RawOrganisation[];

      /*
       * ------------------------------------------------------
       * Server-side search
       * ------------------------------------------------------
       */
      const searchedRecords = applySearch(records, search);

      /*
       * ------------------------------------------------------
       * Server-side status filter
       * ------------------------------------------------------
       */
      const filteredRecords = applyStatusFilter(searchedRecords, status);

      /*
       * ------------------------------------------------------
       * Server-side pagination
       * ------------------------------------------------------
       */
      const responseBody = buildPaginatedResponse(filteredRecords, page, pageSize);

      /*
       * Return a new HttpResponse with our mock API response.
       *
       * httpResource will see this as a normal HTTP response.
       */
      return event.clone({
        url: req.url,
        body: responseBody,
      });
    }),
  );
};
