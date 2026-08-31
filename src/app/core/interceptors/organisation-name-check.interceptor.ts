import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';

import { from, map } from 'rxjs';

import type { RawOrganisation } from '../../shared/models/organisation.model';

interface OrganisationNameCheckResponse {
  available: boolean;
}

const isNameCheckRequest = (req: { method: string; url: string }): boolean =>
  req.method === 'GET' && req.url.toLowerCase() === '/api/organisations/check-name';

const normaliseName = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const organisationNameCheckInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isNameCheckRequest(req)) {
    return next(req);
  }

  const name = req.params.get('name') ?? '';

  return from(
    fetch('/assets/organisations.json').then(
      (response) => response.json() as Promise<RawOrganisation[]>,
    ),
  ).pipe(
    map((organisations): OrganisationNameCheckResponse => {
      const requestedName = normaliseName(name);

      const exists = organisations.some(
        (organisation) => normaliseName(organisation.name) === requestedName,
      );

      return {
        available: !exists,
      };
    }),

    map(
      (body) =>
        new HttpResponse<OrganisationNameCheckResponse>({
          status: 200,
          statusText: 'OK',
          body,
        }),
    ),
  );
};
