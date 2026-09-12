'use client';
import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AudioLines, ArrowRight } from 'lucide-react';
import { appConfig, demoMode } from '@/lib/config';
export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const [confirmPassword, setConfirm] = useState(''),
    [displayName, setName] = useState(''),
    [show, setShow] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('confirmation') === 'failed')
      setError(
        'This email link is invalid or expired. Request a new reset link, or try signing in if your email is already confirmed.',
      );
  }, []);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (signup && password !== confirmPassword) {
      setError('Passwords must match.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          displayName,
          action: signup ? 'signup' : 'signin',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      if (result.confirmation)
        setMessage('Check your inbox to confirm your email, then come back and sign in.');
      else {
        router.replace('/');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-story">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <AudioLines size={24} />
          </span>
          {appConfig.name}.
        </Link>
        <h1>
          A few words.
          <br />A world of
          <br />
          <em>possibilities.</em>
        </h1>
        <p>Make useful English words part of your everyday life. One small loop at a time.</p>
        <span className="auth-motif" aria-hidden="true">
          Aa
        </span>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>{signup ? 'Start your wordbook.' : 'Good to have you here.'}</h2>
          <p>
            {signup
              ? 'A little practice today. More confidence tomorrow.'
              : 'Sign in to pick up your daily practice.'}
          </p>
          {configured && !demoMode ? (
            <>
              {signup && (
                <label>
                  Display name (optional)
                  <input
                    maxLength={60}
                    autoComplete="nickname"
                    value={displayName}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={signup ? 12 : 1}
                  maxLength={128}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {signup && (
                <>
                  <p className="tiny" role="status">
                    {password.length >= 16
                      ? 'Good length. Make sure this password is unique.'
                      : password.length >= 12
                        ? 'Minimum length met. A longer passphrase is stronger.'
                        : 'Use at least 12 characters.'}
                  </p>
                  <label>
                    Confirm password
                    <input
                      type={show ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </label>
                </>
              )}
              <button type="button" className="text-link" onClick={() => setShow(!show)}>
                {show ? 'Hide password' : 'Show password'}
              </button>
              {!signup && (
                <Link href="/forgot-password" className="text-link">
                  Forgot password?
                </Link>
              )}
              <button className="button full" disabled={busy}>
                {busy ? 'One moment…' : signup ? 'Create account' : 'Sign in'}
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setSignup(!signup);
                  setError('');
                  setMessage('');
                }}
              >
                {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
              </button>
            </>
          ) : (
            <div className="notice">
              <p>
                {demoMode
                  ? 'This is an explicitly enabled device demo. Your practice stays in this browser; no account is created.'
                  : 'The app owner needs to configure Supabase before accounts are available.'}
              </p>
              {demoMode && (
                <Link className="button" href="/">
                  Explore the demo
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <p className="tiny">
            Your notes stay private. <Link href="/privacy">Privacy & data</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
