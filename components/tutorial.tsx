'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, Lightbulb, Sparkles } from 'lucide-react';

type Guide = { name: string; goal: string; steps: [string, string][] };
const guides: Record<string, Guide> = {
  '/': {
    name: 'Today',
    goal: 'Turn a few new words into words you can actually use.',
    steps: [
      [
        'Build your daily loop',
        'Choose a manageable Words a day goal and press Let’s begin. Personalize your level and interests if you like. You can change your routine in Settings.',
      ],
      [
        'Fill your word slots',
        'Preview my recommendations offers an editable set. Select any 1–20 words and accept only what you want. Edit today’s set changes your choices before starting. Quick capture saves discoveries for later; Discover and Add a word offer more choices.',
      ],
      [
        'Learn, then come back',
        'Start your daily lesson when your set is ready. The ring shows your daily completion. Review revisits older words when they are due, so new vocabulary stays with you.',
      ],
      [
        'Find your way around',
        'Today is your home. Discover finds words, Review strengthens memory, My words keeps your collection, and Progress shows your growth. On a phone, More opens Settings, where you can also reach Progress. The flame counts your practice streak.',
      ],
    ],
  },
  '/suggested': {
    name: 'Discover',
    goal: 'Choose words that feel useful in your own life.',
    steps: [
      [
        'Find your next word',
        'Browse Suggested at your selected vocabulary level, or your saved words. Search checks both lists at every level. Category chips filter browsing; change your vocabulary level in Settings for different suggestions.',
      ],
      [
        'Today or later?',
        'Open any card to read its full meaning and real-life examples. Add to today fills an available daily slot. The bookmark saves it for later. I know this moves it to Already know and keeps it out of exercises.',
      ],
      [
        'Ready to practice',
        'The selection strip shows your daily set. Once it is full, go to your lesson. Adding is unavailable when the set is full or today’s lesson has started; you can still save suggestions for later.',
      ],
    ],
  },
  '/add': {
    name: 'Add a word',
    goal: 'Make vocabulary from your reading and conversations personal.',
    steps: [
      [
        'Start with a word',
        'Enter the word or short expression you want to learn. LexiLoop recognizes common accent variants, warns about duplicates, and suggests a likely spelling when needed. Add the sentence where you found it for your own reference, then choose Build word card. Only the word is used to generate the lesson; your notes stay private.',
      ],
      [
        'Explore the card',
        'Read the meaning, real-world examples, and a situation where the word fits. The speaker plays pronunciation when your browser supports it. Close, but different explains related words. Usage, combinations and sentence patterns help you use it naturally.',
      ],
      [
        'Keep it in your wordbook',
        'Save to my words keeps the card in your collection; Save & add to today also fills an available daily slot. If you already feel confident, I already know this word keeps it in a separate list and out of exercises. Edit word returns to your input. Notes, tags, and Prioritize this word personalize future recommendations.',
      ],
    ],
  },
  '/learn': {
    name: 'Your lesson',
    goal: 'Move from recognizing a word to recalling and using it.',
    steps: [
      [
        'Meet the word',
        'Meet every selected new word before any exercises. Read the definition, real-life examples, and usage guidance, and use the speaker to hear the word. Then exercises mix new words with every active word learned earlier.',
      ],
      [
        'Try before checking',
        'Mixed exercises ask you to choose an answer or type a word. Press Check answer, then read the feedback. Words and skills you struggled with receive extra practice. The progress bar follows the whole session; pause whenever you need.',
      ],
      [
        'Make it yours',
        'Write your own sentence when asked. Think of a real situation where you could say it. This is personal practice, not an automatically graded grammar test.',
      ],
      [
        'Finish honestly',
        'Choose how well you know the word, then Save & continue records the result and schedules future review. Your question and answers autosave; wait for the saved status before closing. The close icon saves before leaving. Resume saved lesson continues the same draft, including on a later day.',
      ],
    ],
  },
  '/review': {
    name: 'Review',
    goal: 'Recall words again before they fade from memory.',
    steps: [
      [
        'Start with what is due',
        'The due count shows words ready to revisit. Start a short review or choose the larger available set. Practice on an individual word lets you revisit it separately.',
      ],
      [
        'Recall, check, reflect',
        'Try the answer before Check answer, read the feedback, and Continue. Recent mistakes add focused meaning, recall, distinction or usage exercises to future reviews. Rate your confidence honestly and Save & continue. Your saved review can be resumed.',
      ],
      [
        'Caught up is a good thing',
        'Coming back soon shows future reviews. You do not need to force more practice today. Discover new vocabulary or return when another review is due.',
      ],
    ],
  },
  '/collection': {
    name: 'My words',
    goal: 'Keep a personal wordbook you can return to and make your own.',
    steps: [
      [
        'Find a word',
        'Search your collection and use the status filter or sorting control to narrow it down. Open a word to see its full card. Add a word creates a new entry.',
      ],
      [
        'Understand and personalize',
        'The speaker plays pronunciation. Definitions, examples, memory hints and related words explain meaning and usage. Add your context, notes or tag and press Save notes. Favorite makes a word easier to find; Review again revisits a learned word.',
      ],
      [
        'Manage without surprises',
        'Remove from My Words deletes its notes and schedule and closes affected unfinished sessions, while retaining past activity. Progress & word management shows the schedule. Archive word removes it from active practice; Restore word brings it back. Reset learning progress asks for confirmation and clears its schedule and practice sentence while keeping notes and past review history.',
      ],
    ],
  },
  '/progress': {
    name: 'Progress',
    goal: 'Notice steady practice, not just a perfect score.',
    steps: [
      [
        'Read your progress',
        'Your totals show the vocabulary you are building. The streak reflects consecutive practice days. The activity chart shows when you practiced; a quiet day is an invitation to return.',
      ],
      [
        'Understand mastery',
        'Memory evidence shows typed recall at least 24 hours after the previous practice. Unmeasured history is not guessed. Ready-to-use counts come from your own reflections, not automatic grading. The separate Mastered label uses a 30-day interval and confidence of at least 3.',
      ],
      [
        'Choose one next step',
        'Achievements celebrate milestones. To keep growing, return to Today for your daily set or Review for words that are due. Small sessions count.',
      ],
    ],
  },
  '/settings': {
    name: 'Settings',
    goal: 'Make a learning routine that fits your day.',
    steps: [
      [
        'Set your pace',
        'Change your name, daily goal, vocabulary level and interests, then Save settings. A goal change applies tomorrow if today’s lesson has started. Reduce motion and Dark appearance make reading more comfortable.',
      ],
      [
        'Choose your reminders',
        'Set the reminder time and timezone for an in-app nudge. Test notification permission sends an immediate test if supported; it does not schedule background notifications.',
      ],
      [
        'Keep control',
        'Learning tips can be switched off or replayed here. This preference is remembered in this browser. Install LexiLoop explains Home Screen access; Export wordbook downloads your data. Sign out ends your account session.',
      ],
    ],
  },
};
const key = 'lexiloop.learning-tips.v1';
let memory: string | null = null;
function snapshot() {
  try {
    return localStorage.getItem(key) ?? memory;
  } catch {
    return memory;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('lexiloop-tips', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('lexiloop-tips', callback);
  };
}
function preference(value: 'on' | 'off') {
  memory = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Tips still work for this visit when storage is unavailable. */
  }
  window.dispatchEvent(new Event('lexiloop-tips'));
}
function useTips() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function TutorialSettings() {
  const enabled = useTips() === 'on';
  return (
    <div className="panel tutorial-settings">
      <Lightbulb size={27} aria-hidden="true" />
      <h3>Learn your way.</h3>
      <p>Friendly walkthroughs explain the goal of each page and how its controls work.</p>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className="tips-switch"
        onClick={() => preference(enabled ? 'off' : 'on')}
      >
        <span>Learning tips</span>
        <span className="tips-switch-track" aria-hidden="true">
          <span />
        </span>
      </button>
      <p className="tiny">Saved in this browser. Turn tips on anytime to revisit the guides.</p>
      <button
        className="text-link"
        onClick={() => {
          try {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('lexiloop.tip.'))
              .forEach((k) => localStorage.removeItem(k));
          } catch {}
          preference('on');
          window.dispatchEvent(new Event('lexiloop-tips'));
        }}
      >
        Replay contextual tips
      </button>
    </div>
  );
}

export function Tutorial({ path }: { path: string }) {
  const mode = useTips();
  const [step, setStep] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const guide = guides[path];
  if (!guide || mode === 'off') return null;
  if (mode !== 'on')
    return (
      <aside className="tips-invite" aria-label="Optional learning tips">
        <span className="tips-emblem">
          <Sparkles size={22} aria-hidden="true" />
        </span>
        <div>
          <strong>A little guidance, whenever you need it.</strong>
          <p>Want a friendly tour of what to do and how things work?</p>
        </div>
        <div className="tips-invite-actions">
          <button className="button secondary" onClick={() => preference('on')}>
            Show me how <ArrowRight size={16} />
          </button>
          <button className="text-link" onClick={() => preference('off')}>
            No thanks
          </button>
        </div>
      </aside>
    );
  return (
    <section className="tutorial" aria-label={`${guide.name} tutorial`}>
      <div className="tutorial-heading">
        <span className="tips-emblem">
          <Compass size={23} aria-hidden="true" />
        </span>
        <div>
          <span className="eyebrow">YOUR POCKET GUIDE</span>
          <h2>{guide.name}, one step at a time.</h2>
        </div>
        <button
          className="text-link"
          aria-expanded={!collapsed}
          aria-controls="tutorial-content"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? 'Open guide' : 'Hide guide'}
        </button>
      </div>
      {!collapsed && (
        <div id="tutorial-content">
          <p className="tutorial-goal">
            <span>Your goal</span>
            {guide.goal}
          </p>
          <div className="tutorial-body">
            <nav className="tutorial-steps" aria-label="Tutorial steps">
              {guide.steps.map(([title], index) => (
                <button
                  key={title}
                  aria-current={index === step ? 'step' : undefined}
                  onClick={() => setStep(index)}
                >
                  <span>{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                  {title}
                </button>
              ))}
            </nav>
            <div className="tutorial-card">
              <div aria-live="polite" aria-atomic="true">
                <span className="eyebrow">
                  STEP {step + 1} OF {guide.steps.length}
                </span>
                <h3>{guide.steps[step][0]}</h3>
                <p>{guide.steps[step][1]}</p>
              </div>
              <div className="tutorial-controls">
                <button
                  className="text-link"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} /> Back tip
                </button>
                <button
                  className="button"
                  onClick={() => {
                    if (step === guide.steps.length - 1) {
                      setCollapsed(true);
                      setStep(0);
                    } else setStep(step + 1);
                  }}
                >
                  {step === guide.steps.length - 1 ? 'Got it, let’s try' : 'Next tip'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="tutorial-foot">
            <span>You set the pace. Your practice stays right below.</span>
            <button className="text-link" onClick={() => preference('off')}>
              Turn off tips
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ContextTip({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const mode = useTips();
  const dismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(`lexiloop.tip.${id}`) === 'done';
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [hidden, setHidden] = useState(false);
  if (mode !== 'on' || dismissed || hidden) return null;
  return (
    <aside className="context-tip" aria-label={title}>
      <Lightbulb size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(`lexiloop.tip.${id}`, 'done');
          } catch {}
          window.dispatchEvent(new Event('lexiloop-tips'));
        }}
      >
        Got it
      </button>
    </aside>
  );
}
