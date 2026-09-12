'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { catalog as seed } from '@/data/catalog';
import { initialState, applyCommand, type State, type Command } from '@/lib/domain';
import { type Word, validateWord } from '@/lib/ai/schemas';
import { demoMode } from '@/lib/config';
import { inputWordSchema } from '@/lib/validation/word';
type Store = {
  state: State;
  catalog: Word[];
  ready: boolean;
  busy: boolean;
  offline: boolean;
  error: string;
  message: string;
  dispatch: (command: Command) => Promise<boolean>;
  generate: (word: string) => Promise<Word>;
  notify: (message: string) => void;
  reload: () => void;
};
const Context = createContext<Store | null>(null);
const KEY = 'lexiloop-demo-v1';
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState),
    [catalog, setCatalog] = useState(seed),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [offline, setOffline] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [, refreshClock] = useState(0);
  const current = useRef(state),
    locked = useRef(false);
  const reload = useCallback(async () => {
    setError('');
    try {
      if (demoMode) {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed.state?.settings &&
            Array.isArray(parsed.state.words) &&
            Array.isArray(parsed.state.events)
          ) {
            current.current = parsed.state;
            setState(parsed.state);
            setCatalog(parsed.catalog.map(validateWord));
          }
        } else {
          const fresh = initialState();
          fresh.settings.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          current.current = fresh;
          setState(fresh);
        }
      } else {
        const res = await fetch('/api/state', { cache: 'no-store' });
        const data = await res.json();
        if (res.status === 401) {
          setState(initialState());
          setCatalog(seed);
          setReady(false);
          window.location.replace('/login');
          throw new Error('Please sign in to continue.');
        }
        if (!res.ok) throw new Error(data.error);
        current.current = data.state;
        setState(data.state);
        setCatalog(data.catalog.map(validateWord));
      }
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your collection.');
    }
  }, []);
  useEffect(() => {
    void reload();
    const clock = setInterval(() => refreshClock((t) => t + 1), 60000);
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const storage = (event: StorageEvent) => {
      if (event.key === KEY) void reload();
    };
    window.addEventListener('storage', storage);
    const resume = (event: PageTransitionEvent) => {
      if (!demoMode && event.persisted) {
        setReady(false);
        void reload();
      }
    };
    const authChange = (event: StorageEvent) => {
      if (!demoMode && event.key === 'lexiloop-auth-change') {
        setReady(false);
        setState(initialState());
        void reload();
      }
    };
    window.addEventListener('pageshow', resume);
    window.addEventListener('storage', authChange);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      clearInterval(clock);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('storage', storage);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('storage', authChange);
    };
  }, [reload]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.dark ? 'dark' : 'light';
    document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduce' : 'system';
  }, [state.settings.dark, state.settings.reducedMotion]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  async function dispatch(command: Command) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      let next: State;
      if (demoMode) {
        const raw = localStorage.getItem(KEY);
        if (raw && JSON.parse(raw).state.version !== current.current.version)
          throw new Error('Your progress changed in another tab. Reload and try again.');
        next = applyCommand(current.current, command, catalog);
        localStorage.setItem(KEY, JSON.stringify({ state: next, catalog }));
      } else {
        if (!navigator.onLine)
          throw new Error(
            'You’re offline. You can read loaded words; reconnect before saving progress.',
          );
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: current.current.version, command }),
        });
        const data = await res.json();
        if (res.status === 401) {
          setState(initialState());
          setCatalog(seed);
          setReady(false);
          window.location.replace('/login');
          throw new Error('Please sign in to continue.');
        }
        if (!res.ok) throw new Error(data.error);
        next = data.state;
      }
      current.current = next;
      setState(next);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your change could not be saved. Try again.');
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function generate(input: string) {
    const normalized = inputWordSchema.parse(input);
    const existing = catalog.find((w) => w.word === normalized);
    if (existing && demoMode) return existing;
    if (demoMode)
      throw new Error(
        'Demo mode includes 20 curated words. Try “reluctant”, “feasible”, or “clarify”. Configure live AI for other words.',
      );
    if (!navigator.onLine)
      throw new Error('Reconnect to build a new word. Your input is still here.');
    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: normalized }),
    });
    const data = await res.json();
    if (res.status === 401) {
      setState(initialState());
      setCatalog(seed);
      setReady(false);
      window.location.replace('/login');
      throw new Error('Please sign in to continue.');
    }
    if (!res.ok) throw new Error(data.error);
    const word = validateWord(data.word);
    setCatalog((previous) =>
      previous.some((w) => w.word === word.word) ? previous : [...previous, word],
    );
    return word;
  }
  return (
    <Context.Provider
      value={{
        state,
        catalog,
        ready,
        busy,
        offline,
        error,
        message,
        dispatch,
        generate,
        notify: setMessage,
        reload: () => void reload(),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('Missing store provider');
  return store;
}
