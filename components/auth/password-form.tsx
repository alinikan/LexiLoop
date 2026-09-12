'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmPassword, setConfirm] = useState('');
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (reset && password !== confirmPassword) {
      setError('Passwords must match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          reset ? { action: 'reset', password, confirmPassword } : { action: 'forgot', email },
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (reset) localStorage.setItem('lexiloop-auth-change', String(Date.now()));
      setMessage(data.message);
      setPassword('');
      setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="standalone-page">
      <Link href="/login" className="text-link">
        ← Back to sign in
      </Link>
      <h1>{reset ? 'Choose a new password.' : 'Find your way back.'}</h1>
      <form className="panel settings-form" onSubmit={submit}>
        {reset ? (
          <>
            <label>
              New password
              <input
                type={show ? 'text' : 'password'}
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <p className="tiny">
              Use 12 or more characters. A few unrelated words make a strong, memorable password.
            </p>
            <label>
              Confirm new password
              <input
                type={show ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <button type="button" className="text-link" onClick={() => setShow(!show)}>
              {show ? 'Hide passwords' : 'Show passwords'}
            </button>
          </>
        ) : (
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
        )}
        <button className="button" disabled={busy || (reset && !!message)}>
          {busy ? 'One moment…' : reset ? 'Update password' : 'Send reset link'}
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {reset && message && (
          <Link href="/login" className="button secondary">
            Sign in
          </Link>
        )}
      </form>
    </main>
  );
}
