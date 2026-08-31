import { Component, signal } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-status-cell',
  standalone: true,
  imports: [NgbTooltip],
  template: `
    <span
      class="status-dot"
      [class.status-dot--active]="status() === 'active'"
      [class.status-dot--inactive]="status() === 'inactive'"
      [class.status-dot--suspended]="status() === 'suspended'"
      [class.status-dot--unknown]="status() === 'unknown'"
      [ngbTooltip]="label()"
      [attr.aria-label]="label()"
      role="img"
    ></span>
  `,
})
export class StatusCellComponent implements ICellRendererAngularComp {
  readonly status = signal('unknown');

  agInit(params: ICellRendererParams): void {
    this.status.set(this.getStatusValue(params));
  }

  refresh(params: ICellRendererParams): boolean {
    this.status.set(this.getStatusValue(params));

    return true;
  }

  private getStatusValue(params: ICellRendererParams): string {
    const status = String(params.value ?? params.data?.status ?? '')
      .trim()
      .toLowerCase();

    if (status === 'active' || status === 'inactive' || status === 'suspended') {
      return status;
    }

    return 'unknown';
  }

  readonly label = () => {
    switch (this.status()) {
      case 'active':
        return 'Active';

      case 'inactive':
        return 'Inactive';

      case 'suspended':
        return 'Suspended';

      default:
        return 'Unknown status';
    }
  };
}
