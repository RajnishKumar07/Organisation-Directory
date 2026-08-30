import { DatePipe } from '@angular/common';
import type { ColDef } from 'ag-grid-community';

import type { RawOrganisation } from '../../../shared/models/organisation.model';

const datePipe = new DatePipe('en-GB');

const safeString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

export const COLUMN_DEFS: ColDef<RawOrganisation>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 2,

    // Requirement: sortable by name
    sortable: true,

    // Handle null name safely
    valueFormatter: (params) => {
      return safeString(params.value) || '-';
    },
  },

  {
    field: 'status',
    headerName: 'Status',
    flex: 1,

    // Not required to be sortable
    sortable: false,

    valueFormatter: (params) => {
      const status = safeString(params.value);

      if (!status) {
        return '-';
      }

      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    },
  },

  {
    field: 'memberCount',
    headerName: 'Members',
    flex: 1,

    // Not required to be sortable
    sortable: false,

    valueFormatter: (params) => {
      if (params.value === null || params.value === undefined || params.value === '') {
        return '-';
      }

      return String(params.value);
    },
  },

  {
    field: 'owner',
    headerName: 'Owner',
    flex: 1,

    // Not required to be sortable
    sortable: false,

    valueFormatter: (params) => {
      return safeString(params.value) || '-';
    },
  },

  {
    field: 'createdAt',
    headerName: 'Created',
    flex: 1,
    sortable: true,

    comparator: (valueA, valueB) => {
      const dateA = getValidDate(valueA);
      const dateB = getValidDate(valueB);

      const timeA = dateA?.getTime() ?? 0;
      const timeB = dateB?.getTime() ?? 0;

      return timeA - timeB;
    },

    valueFormatter: (params) => {
      const date = getValidDate(params.value);

      if (!date) {
        return '-';
      }

      return datePipe.transform(date, 'dd MMM yyyy') ?? '-';
    },
  },
];

const getValidDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value as string | number);

  return Number.isNaN(date.getTime()) ? null : date;
};
