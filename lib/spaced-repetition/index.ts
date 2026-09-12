export type Schedule = {
  firstLearned: string | null;
  lastReviewed: string | null;
  nextReview: string | null;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  interval: number;
  ease: number;
  confidence: number;
  lapses: number;
  streak: number;
};
export const freshSchedule = (): Schedule => ({
  firstLearned: null,
  lastReviewed: null,
  nextReview: null,
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  interval: 0,
  ease: 2.5,
  confidence: 0,
  lapses: 0,
  streak: 0,
});
export function scheduleReview(
  previous: Schedule,
  quality: 0 | 1 | 2 | 3,
  now = new Date(),
): Schedule {
  const passed = quality >= 2;
  const ease = Math.max(
    1.3,
    Math.min(3.2, previous.ease + (quality === 3 ? 0.12 : quality === 2 ? -0.04 : -0.2)),
  );
  const streak = passed ? previous.streak + 1 : 0;
  const interval = !passed
    ? quality === 0
      ? 10 / 1440
      : 1
    : streak === 1
      ? 1
      : streak === 2
        ? 3
        : Math.max(4, Math.round(previous.interval * ease * (quality === 3 ? 1.15 : 1)));
  return {
    ...previous,
    firstLearned: previous.firstLearned ?? now.toISOString(),
    lastReviewed: now.toISOString(),
    nextReview: new Date(now.getTime() + interval * 86400000).toISOString(),
    reviewCount: previous.reviewCount + 1,
    correctCount: previous.correctCount + Number(passed),
    incorrectCount: previous.incorrectCount + Number(!passed),
    interval,
    ease,
    confidence: quality === 3 ? 4 : quality === 2 ? 3 : quality,
    lapses: previous.lapses + Number(!passed),
    streak,
  };
}
