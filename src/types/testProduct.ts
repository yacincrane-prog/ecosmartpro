export interface TestProduct {
  id: string;
  userId: string;
  name: string;
  description: string;
  imageUrl: string;
  status: 'active' | 'trashed';
  createdAt: string;
  competitors: TestCompetitor[];
  score: TestProductScore | null;
}

export interface TestCompetitor {
  id: string;
  testProductId: string;
  websiteUrl: string;
  videoUrl: string;
  sellingPrice: number;
  createdAt: string;
}

export interface TestProductScore {
  id: string;
  testProductId: string;
  solvesProblem: number;
  wowFactor: number;
  hasVideos: number;
  smallNoVariants: number;
  sellingNow: number;
}

export type ScoreLabel = 'ready' | 'risky' | 'reject';

export const SCORE_CRITERIA = [
  { key: 'solvesProblem' as const, label: 'هل يحل مشكلة واضحة؟', weight: 25 },
  { key: 'wowFactor' as const, label: 'هل له عنصر Wow Factor؟', weight: 20 },
  { key: 'hasVideos' as const, label: 'هل تتوفر فيديوهات له؟', weight: 15 },
  { key: 'smallNoVariants' as const, label: 'هل صغير الحجم وليس فيه متغيرات؟', weight: 20 },
  { key: 'sellingNow' as const, label: 'هل يباع الآن؟', weight: 20 },
];

export function calculateTotalScore(score: TestProductScore): number {
  let total = 0;
  for (const c of SCORE_CRITERIA) {
    total += (score[c.key] / 5) * c.weight;
  }
  return Math.round(total);
}

export function getScoreLabel(totalScore: number): ScoreLabel {
  if (totalScore >= 70) return 'ready';
  if (totalScore >= 45) return 'risky';
  return 'reject';
}

export function getScoreLabelInfo(label: ScoreLabel) {
  switch (label) {
    case 'ready': return { text: 'Ready to Test 🟢', color: 'text-profit' };
    case 'risky': return { text: 'Risky 🟡', color: 'text-warning' };
    case 'reject': return { text: 'Reject 🔴', color: 'text-destructive' };
  }
}
