import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `<div class="animate-pulse rounded bg-slate-200" [class]="customClass"></div>`,
})
export class SkeletonComponent {
  @Input() customClass = 'h-4 w-full';
}

@Component({
  selector: 'app-skeleton-table',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      @for (row of rowsArray; track $index) {
        <div class="flex items-center gap-4 px-5 py-4">
          <app-skeleton customClass="h-9 w-9 rounded-full" />
          <app-skeleton customClass="h-4 w-1/4" />
          <app-skeleton customClass="h-4 w-1/6" />
          <app-skeleton customClass="h-4 w-1/6" />
          <app-skeleton customClass="ml-auto h-6 w-20 rounded-full" />
        </div>
      }
    </div>
  `,
})
export class SkeletonTableComponent {
  @Input() rows = 4;

  get rowsArray() {
    return Array.from({ length: this.rows });
  }
}

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <app-skeleton customClass="h-4 w-1/3" />
      <app-skeleton customClass="h-8 w-1/2" />
      <app-skeleton customClass="h-3 w-2/3" />
    </div>
  `,
})
export class SkeletonCardComponent {}
