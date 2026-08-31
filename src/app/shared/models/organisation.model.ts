import { FormControl } from '@angular/forms';

export type OrganisationStatus = 'active' | 'inactive' | 'suspended';

/*
 * This represents the data exactly as it can arrive
 * from the API.
 *
 * We intentionally allow malformed values here because
 * the assessment asks us to handle the bad fixture data.
 */
export interface RawOrganisation {
  id: number;

  name: string | null;

  /*
   * Can contain values such as:
   * "active"
   * "ACTIVE"
   * "Active"
   * "actve"
   * null
   */
  status: string | null;

  /*
   * The fixture contains:
   * - number
   * - string
   * - null
   * - negative number
   */
  memberCount: number | string | null;

  /*
   * owner can be completely missing.
   */
  owner?: {
    email?: string | null;
  } | null;

  /*
   * The fixture contains:
   * - ISO date string
   * - numeric timestamp
   * - invalid date string
   */
  createdAt: string | number | null;
}

export interface OrganisationListApiResponse {
  data: RawOrganisation[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface ApiErrorResponse {
  message: string;
}

export type OrganisationStatusFilter = OrganisationStatus | 'all';

export interface CreateOrganisationForm {
  name: FormControl<string>;
  status: FormControl<OrganisationStatus | ''>;
  ownerEmail: FormControl<string>;
  memberCount: FormControl<number | null>;
}
