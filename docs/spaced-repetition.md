# Spaced repetition and progress

The scheduler in `lib/spaced-repetition/index.ts` is pure: prior schedule + quality + timestamp → next schedule. Tests fix timestamps, so calendar and interval regressions are reproducible.

| Quality | Meaning                                    | Next interval                                                           |
| ------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| 0       | At least one incorrect exercise            | 10 minutes; reset consecutive successes                                 |
| 1       | No exercise error, but low self-confidence | 1 day; reset consecutive successes                                      |
| 2       | Successful recall with moderate confidence | 1 day on first success; 3 days on second; then previous interval × ease |
| 3       | Successful recall and “I know it well”     | Same initial steps; then previous interval × ease × 1.15                |

Ease starts at 2.5, is bounded to 1.3–3.2, and changes by −0.2 / −0.2 / −0.04 / +0.12. Expanded intervals round to whole days and have a four-day floor after the first two successful steps. A failure always increments lapse/incorrect counts, resets success streak, and preserves historical first-learned timestamp.

All timestamps are ISO UTC instants. Due means `nextReview <= now`; overdue items naturally sort first. Quick review takes five due words; full review takes up to thirty. Sorting by due time mixes ages without delaying overdue items to meet an arbitrary ratio.

Mastered means interval ≥30 days and confidence ≥3. Learning/needs-practice filters use live schedules, while achievement counts and streaks derive from history. Resetting a word clears its schedule and practice sentence but keeps past events and personal notes.

XP is 20 per completed new word and 10 per completed review. “Practice success” is successful completed word sessions divided by all word sessions; it is not a count of individual correct button presses. Perfect-review/comeback achievements are not implemented. There is no streak penalty currency, paid freeze or fabricated activity.

The model is SM-2-inspired, not exact SM-2 or FSRS. It prioritizes transparency over statistical fitting. To change algorithms, retain old events, add an algorithm version, compare interval outcomes on representative histories, and migrate carefully rather than rewriting past events.
