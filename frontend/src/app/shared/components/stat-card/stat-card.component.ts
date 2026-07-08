import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type StatTone = 'default' | 'critical' | 'accent';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div
      class="flex flex-1 flex-col gap-3 rounded-xl border bg-white px-5 py-4"
      [class]="tone === 'accent' ? 'border-blue-600 ring-1 ring-blue-600/20' : 'border-slate-200'"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ label }}</span>
        <ng-content select="[icon]" />
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold text-slate-800">{{ value }}</span>
        @if (badge) {
          <span
            class="rounded px-1.5 py-0.5 text-xs font-semibold"
            [class]="tone === 'critical' ? 'bg-red-100 text-red-600' : 'text-emerald-600'"
          >
            {{ badge }}
          </span>
        }
      </div>
      @if (link) {
        <a [routerLink]="link" class="text-xs font-semibold text-blue-600 hover:underline">
          {{ linkLabel }}
        </a>
      }
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: number | string;
  @Input() badge?: string;
  @Input() tone: StatTone = 'default';
  @Input() link?: string;
  @Input() linkLabel = 'View list';
}
