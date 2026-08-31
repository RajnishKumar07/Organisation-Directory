import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TranslocoPipe } from '@jsverse/transloco';

import {
  CreateOrganisationForm,
  OrganisationStatus,
} from '../../../shared/models/organisation.model';
import { uniqueOrganisationNameValidator } from '../../../shared/validators/unique-organisation-name.validator';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [ReactiveFormsModule, TranslocoPipe, RouterLink],
  selector: 'app-add',
  styleUrl: './add.scss',
  templateUrl: './add.html',
})
export class Add {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  readonly organisationForm = this.fb.group<CreateOrganisationForm>({
    name: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(80)],

      asyncValidators: [uniqueOrganisationNameValidator()],
    }),

    status: this.fb.control<OrganisationStatus | ''>('', [Validators.required]),

    ownerEmail: this.fb.control('', [Validators.required, Validators.email]),

    memberCount: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  get name() {
    return this.organisationForm.controls.name;
  }

  get status() {
    return this.organisationForm.controls.status;
  }

  get ownerEmail() {
    return this.organisationForm.controls.ownerEmail;
  }

  get memberCount() {
    return this.organisationForm.controls.memberCount;
  }

  submit(): void {
    if (this.organisationForm.invalid) {
      this.organisationForm.markAllAsTouched();
      return;
    }

    const formValue = this.organisationForm.getRawValue();

    console.log(formValue);
    this.router.navigate(['']);
  }
}
