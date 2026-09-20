export const achievements = [
  {
    id: 'first5',
    title: 'A strong start',
    description: 'Learn your first 5 words',
    target: 5,
    metric: 'learned',
  },
  {
    id: 'week',
    title: 'In the loop',
    description: 'Practice for 7 days in a row',
    target: 7,
    metric: 'streak',
  },
  {
    id: 'fifty',
    title: 'Finding your voice',
    description: 'Learn 50 words',
    target: 50,
    metric: 'learned',
  },
  {
    id: 'reviews',
    title: 'Made to last',
    description: 'Complete 100 reviews',
    target: 100,
    metric: 'reviews',
  },
] as const;
