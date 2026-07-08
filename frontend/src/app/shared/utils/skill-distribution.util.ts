import { Member } from '../../core/types';

export interface SkillDistributionSlice {
  label: string;
  pct: number;
  barClasses: string;
}

const CATEGORIES: { label: string; keywords: string[]; barClasses: string }[] = [
  { label: 'Backend', keywords: ['backend', 'node', 'api', 'database', 'server'], barClasses: 'bg-blue-600' },
  { label: 'Frontend', keywords: ['frontend', 'angular', 'react', 'ui', 'css'], barClasses: 'bg-slate-500' },
  { label: 'DevOps', keywords: ['devops', 'ci/cd', 'infra', 'kubernetes', 'docker'], barClasses: 'bg-amber-500' },
];

/**
 * The PDF schema stores free-form `skills` tags per member, not a
 * pre-computed team skill breakdown. This derives an approximate
 * Backend/Frontend/DevOps split by keyword-matching each member's skill
 * tags. Swap for a dedicated `GET /api/teams/:id/skill-distribution`
 * endpoint if the backend starts computing this server-side.
 */
export function computeSkillDistribution(members: Member[]): SkillDistributionSlice[] {
  const counts = CATEGORIES.map(() => 0);
  let total = 0;

  for (const member of members) {
    for (const skill of member.skills ?? []) {
      const lower = skill.toLowerCase();
      const idx = CATEGORIES.findIndex((c) => c.keywords.some((k) => lower.includes(k)));
      if (idx >= 0) {
        counts[idx]++;
        total++;
      }
    }
  }

  if (total === 0) {
    return CATEGORIES.map((c) => ({ label: c.label, pct: 0, barClasses: c.barClasses }));
  }

  return CATEGORIES.map((c, i) => ({
    label: c.label,
    pct: Math.round((counts[i] / total) * 100),
    barClasses: c.barClasses,
  }));
}
