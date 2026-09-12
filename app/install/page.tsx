import Link from 'next/link';
import { appConfig } from '@/lib/config';
export default function Install() {
  return (
    <main className="standalone-page">
      <Link className="text-link" href="/">
        ← Back to your words
      </Link>
      <p className="eyebrow">ALWAYS WITHIN REACH</p>
      <h1>
        Your daily loop.
        <br />
        One tap away.
      </h1>
      <p>Add {appConfig.name} to your Home Screen for a focused, app-like experience.</p>
      <section className="panel">
        <h2>On your iPhone</h2>
        <ol>
          <li>
            Open this website in <strong>Safari</strong>.
          </li>
          <li>
            Tap <strong>More → Share</strong>, or the Share button in your Safari layout.
          </li>
          <li>
            Scroll to <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Turn on <strong>Open as Web App</strong> if shown, confirm the name, then tap{' '}
            <strong>Add</strong>.
          </li>
        </ol>
        <p>Open the new icon to start practicing. Installation requires a secure HTTPS website.</p>
      </section>
      <section className="panel">
        <h2>Android or desktop</h2>
        <p>
          Open your browser menu and choose “Install app” or “Add to Home screen” when available.
        </p>
        <h3>When you’re offline</h3>
        <p>
          The app caches public assets and an offline welcome page. Already loaded words stay
          readable while the app is open. Account changes need a connection and will show an error
          instead of silently losing progress.
        </p>
        <h3>About reminders</h3>
        <p>
          Daily reminders appear inside the app. This release does not send scheduled background
          notifications. The notification button in Settings only sends an immediate test on
          supported browsers.
        </p>
      </section>
    </main>
  );
}
