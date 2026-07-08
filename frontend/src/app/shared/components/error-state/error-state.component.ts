import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 px-6 py-10 text-center">
      <svg class="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <p class="text-sm font-semibold text-red-700">{{ title }}</p>
      <p class="max-w-sm text-sm text-red-600">{{ message }}</p>
      @if (retryable) {
        <button
          type="button"
          (click)="retry.emit()"
          class="mt-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Try again
        </button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() title = "Couldn't load this data";
  @Input() message = 'Something went wrong while talking to the server. Please try again.';
  @Input() retryable = true;
  @Output() retry = new EventEmitter<void>();
}
