export const appConfig = {
  name: 'LexiLoop',
  shortName: 'LexiLoop',
  tagline: 'Small steps. Lasting words.',
  theme: '#334de8',
  defaultGoal: 5,
};
export const demoMode =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
