export function statusClass(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'badge badge-green';
    case 'BLOCKED': return 'badge badge-red';
    case 'PROCESSING': return 'badge badge-blue';
    default: return 'badge badge-gray';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'Completed';
    case 'BLOCKED': return 'Blocked';
    case 'PROCESSING': return 'In Progress';
    default: return status;
  }
}

export function priorityClass(priority: string): string {
  switch (priority) {
    case 'Critical': return 'badge badge-red';
    case 'High': return 'badge badge-orange';
    case 'Low': return 'badge badge-gray';
    default: return 'badge badge-blue-soft';
  }
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PALETTE = ['#2554E8', '#D97706', '#059669', '#7C3AED', '#DC2626', '#0891B2'];
export function avatarColor(name: string | undefined | null): string {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const BADGE_STYLES = `
  .badge {
    display: inline-flex; align-items: center; padding: 4px 10px;
    border-radius: 999px; font-size: 12px; font-weight: 600;
  }
  .badge-green { background: #E6F7EE; color: #0F9D58; }
  .badge-red { background: #FDECEC; color: #D93025; }
  .badge-blue { background: #E8EFFE; color: #2554E8; }
  .badge-blue-soft { background: #EEF2FF; color: #4F5B93; }
  .badge-orange { background: #FFF2E3; color: #B65C00; }
  .badge-gray { background: #F0F2F6; color: #616B7D; }
`;
