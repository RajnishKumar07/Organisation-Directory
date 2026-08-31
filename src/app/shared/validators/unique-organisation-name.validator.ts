import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import { inject } from '@angular/core';

interface OrganisationNameCheckResponse {
  available: boolean;
}

export function uniqueOrganisationNameValidator(debounceMs = 400): AsyncValidatorFn {
  const http = inject(HttpClient);

  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const name = String(control.value ?? '').trim();

    if (!name) {
      return of(null);
    }

    return timer(debounceMs).pipe(
      switchMap(() =>
        http.get<OrganisationNameCheckResponse>('/api/organisations/check-name', {
          params: { name },
        }),
      ),
      map((response) => {
        console.log('response---->', response);
        return response.available ? null : { notUnique: true };
      }),
      catchError(() => of(null)),
    );
  };
}
