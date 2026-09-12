'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-page">
      <h1>We hit a small interruption.</h1>
      <p>Your saved words are still there. Try opening the page again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
