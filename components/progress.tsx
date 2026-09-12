'use client';
import { Trophy, Flame, Target, BookOpen, Check } from 'lucide-react';
import { useStore } from './store';
import { metrics, dayKey } from '@/lib/domain';
import { achievements } from '@/data/catalog';
export function Progress() {
  const { state } = useStore(),
    stats = metrics(state);
  const today = new Date(dayKey(new Date(), state.settings.timezone) + 'T12:00:00Z');
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000),
      date = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
      count: state.summary?.activity[date] ?? state.events.filter((e) => e.date === date).length,
      date,
    };
  });
  const max = Math.max(5, ...week.map((d) => d.count));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LOOK HOW FAR YOUR WORDS GO</p>
          <h1>Small steps add up.</h1>
          <p>Every word you practice is another way to express yourself.</p>
        </div>
      </div>
      <div className="stats-grid">
        {[
          { icon: BookOpen, value: stats.learned, label: 'Words learned' },
          { icon: Flame, value: stats.streak, label: 'Current streak' },
          { icon: Target, value: `${stats.accuracy}%`, label: 'Practice success' },
          { icon: Trophy, value: stats.xp, label: 'Total XP' },
        ].map(({ icon: Icon, value, label }) => (
          <div className="stat-panel panel" key={label}>
            <Icon size={23} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="progress-grid">
        <section className="panel activity-panel">
          <div className="section-heading">
            <h2>Your last seven days</h2>
            <span className="tiny">Learning + review</span>
          </div>
          <div
            className="activity-chart"
            role="img"
            aria-label={week.map((d) => `${d.label}: ${d.count} words practiced`).join(', ')}
          >
            {week.map((d) => (
              <div key={d.date}>
                <span>{d.count}</span>
                <div className="bar-track">
                  <div style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }} />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel mastery-panel">
          <h2>Made to last</h2>
          <div>
            <strong>{stats.mastered}</strong>
            <span>words mastered</span>
          </div>
          <p>Words with confident recall and review intervals of at least 30 days.</p>
          <dl>
            <div>
              <dt>Longest streak</dt>
              <dd>{stats.longest} days</dd>
            </div>
            <div>
              <dt>Reviews completed</dt>
              <dd>{stats.reviews}</dd>
            </div>
            <div>
              <dt>Daily goals completed</dt>
              <dd>{stats.completedDays}</dd>
            </div>
          </dl>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>Milestones, not finish lines.</h2>
          <p>Little celebrations along the way.</p>
        </div>
      </div>
      <div className="achievement-grid">
        {achievements.map((a) => {
          const value = stats[a.metric],
            unlocked = value >= a.target;
          return (
            <article className={'panel achievement ' + (unlocked ? 'unlocked' : '')} key={a.id}>
              <span className="achievement-icon">
                {unlocked ? <Check size={29} /> : <Trophy size={29} />}
              </span>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
              <span className="tiny">
                {unlocked ? 'Unlocked' : `${Math.min(value, a.target)} / ${a.target}`}
              </span>
            </article>
          );
        })}
      </div>
    </>
  );
}
