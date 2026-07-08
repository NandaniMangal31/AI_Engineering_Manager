import { Component, Input, computed, signal } from '@angular/core';

const PALETTE = [
  'bg-blue-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-rose-600',
  'bg-slate-600',
];

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div
      class="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      [class]="sizeClasses() + ' ' + colorClass()"
    >
      {{ initials() }}
    </div>
  `,
})
export class AvatarComponent {
  @Input({ required: true }) set name(value: string) {
    this._name.set(value ?? '');
  }
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  private _name = signal('');

  initials = computed(() =>
    this._name()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('')
  );

  colorClass = computed(() => {
    const str = this._name();
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return PALETTE[Math.abs(hash) % PALETTE.length];
  });

  sizeClasses(): string {
    switch (this.size) {
      case 'sm':
        return 'h-7 w-7 text-xs';
      case 'lg':
        return 'h-12 w-12 text-base';
      case 'md':
      default:
        return 'h-9 w-9 text-sm';
    }
  }
}
