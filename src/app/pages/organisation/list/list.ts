import { Component, computed, debounced, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import {
  OrganisationListApiResponse,
  OrganisationStatusFilter,
  RawOrganisation,
} from '../../../shared/models/organisation.model';
import { TranslocoPipe } from '@jsverse/transloco';

import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import type { BodyScrollEndEvent, ColDef, GetRowIdParams } from 'ag-grid-community'; // Column Definition Type Interface
import { COLUMN_DEFS } from './list.column';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-list',
  imports: [TranslocoPipe, AgGridAngular],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  /*
   * ============================================================
   * Request state
   * ============================================================
   *
   * These are signals because changing search/status should
   * automatically trigger httpResource to make a new request.
   */

  readonly search = signal(this.route.snapshot.queryParamMap.get('search') ?? '');

  readonly debouncedSearch = debounced(this.search, 400);

  readonly status = signal<OrganisationStatusFilter>(this.getInitialStatus());

  /*
   * Current page.
   *
   * For the first request we start from page 1.
   *
   * Later, when we implement infinite scrolling with AG Grid,
   * this value will be increased when the user reaches the
   * end of the currently loaded data.
   */

  readonly page = signal(1);

  /*
   * Maximum number of records requested from the API.
   *
   * The interceptor will enforce the maximum page size of 25.
   */

  readonly pageSize = 25;

  rowData = signal<RawOrganisation[]>([]);

  readonly errorMessage = computed(() => {
    const error = this.organisationsResource.error();

    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? error.message;
    }

    return error?.message ?? '';
  });

  /*
   * ============================================================
   * Organisations API resource
   * ============================================================
   *
   * httpResource automatically tracks:
   *
   * - loading state
   * - response value
   * - error state
   *
   * The request function reads the signals above.
   *
   * Therefore, when search(), status(), or page() changes,
   * httpResource automatically creates a new request.
   */

  readonly organisationsResource = httpResource<OrganisationListApiResponse>(() => {
    /*
     * Read the current values from our signals.
     */
    const search = this.debouncedSearch.value().trim();

    const status = this.status();

    const page = this.page();

    /*
     * Build query parameters.
     *
     * We don't send status=all because "all" means that
     * no status filtering is required.
     */

    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(this.pageSize),
    };

    /*
     * Only send search when the user has entered a value.
     */
    if (search) {
      params['search'] = search;
    }

    /*
     * Only send status when a specific status is selected.
     */
    if (status !== 'all') {
      params['status'] = status;
    }

    /*
     * httpResource will make:
     *
     * /api/organisations?page=1&pageSize=25
     *
     * or:
     *
     * /api/organisations?
     *   page=1&
     *   pageSize=25&
     *   search=globex&
     *   status=active
     *
     * Our interceptor handles this request.
     */

    return {
      url: '/api/organisations',
      params,
    };
  });

  readonly columnDefs: ColDef<RawOrganisation>[] = COLUMN_DEFS;

  constructor() {
    effect(() => {
      if (!this.organisationsResource.hasValue()) {
        return;
      }

      const response = this.organisationsResource.value();

      if (response.page === 1) {
        this.rowData.set(response.data);
        return;
      }

      this.rowData.update((current) => [...current, ...response.data]);
    });
    effect(() => {
      const search = this.debouncedSearch.value();

      this.updateUrl(search, this.status());
    });
  }

  /*
   * ============================================================
   * Search
   * ============================================================
   */

  setSearch(value: string): void {
    /*
     * Reset to page 1 whenever the search criteria changes.
     *
     * Otherwise, if the user is currently on page 3 and
     * changes the search, we might request page 3 of a
     * completely different result set.
     */
    this.page.set(1);

    this.search.set(value);
  }

  /*
   * ============================================================
   * Status filter
   * ============================================================
   */

  setStatus(status: OrganisationStatusFilter): void {
    /*
     * Reset pagination when the filter changes.
     */
    this.page.set(1);

    this.status.set(status);

    this.updateUrl(this.debouncedSearch.value(), status);
  }

  onBodyScrollEnd(event: BodyScrollEndEvent): void {
    if (this.organisationsResource.isLoading()) {
      return;
    }

    const response = this.organisationsResource.value();

    if (!response?.hasNextPage) {
      return;
    }

    const totalRows = event.api.getDisplayedRowCount();

    if (totalRows === 0) {
      return;
    }

    const lastVisibleRowIndex = event.api.getLastDisplayedRowIndex();

    /*
     * AG Grid reports the last visible row index in the viewport.
     * When the user reaches the end of the currently loaded rows,
     * we request the next page.
     */
    const isAtBottom = lastVisibleRowIndex >= totalRows - 2;

    if (isAtBottom) {
      this.loadNextPage();
    }
  }

  readonly getRowId = (params: GetRowIdParams<RawOrganisation>) => String(params.data.id);

  /*
   * ============================================================
   * Pagination
   * ============================================================
   *
   * This method will be used later by the infinite-scroll /
   * AG Grid implementation.
   */

  private loadNextPage(): void {
    if (this.organisationsResource.isLoading()) {
      return;
    }

    const response = this.organisationsResource.value();

    /*
     * Don't request another page when the API tells us that
     * there are no more records.
     */
    if (!response?.hasNextPage) {
      return;
    }

    this.page.update((currentPage) => currentPage + 1);
  }

  private getInitialStatus(): OrganisationStatusFilter {
    const status = this.route.snapshot.queryParamMap.get('status');

    if (status === 'active' || status === 'inactive' || status === 'suspended') {
      return status;
    }

    return 'all';
  }

  private updateUrl(search: string, status: OrganisationStatusFilter): void {
    this.router.navigate([], {
      relativeTo: this.route,

      queryParams: {
        search: search.trim() || null,
        status: status === 'all' ? null : status,
      },

      replaceUrl: true,
    });
  }
}
