import Link from 'next/link';
export default function Privacy() {
  return (
    <main className="standalone-page">
      <Link className="text-link" href="/">
        ← Back to your words
      </Link>
      <p className="eyebrow">YOUR WORDS ARE PERSONAL</p>
      <h1>Privacy & data.</h1>
      <section className="panel">
        <h2>What is saved</h2>
        <p>
          Your email is managed by Supabase Auth. Your account stores your words, notes, encountered
          sentences, daily goals, settings, review history, unfinished session answers, quick
          captures, skill results, and your self-assessed vocabulary practice journal. Other users
          cannot read your learning data.
        </p>
        <h2>AI word lessons</h2>
        <p>
          When a new word needs a lesson, only the requested word is sent to the configured AI
          provider. Your notes and practice sentences are not sent. Lexical content is reusable
          across accounts, so avoid entering private names or secrets as vocabulary words. AI
          lessons can be imperfect; review content before saving.
        </p>
        <h2>Cambridge Dictionary</h2>
        <p>
          Word cards include an ordinary external link to Cambridge Dictionary. The app has no
          Cambridge API integration and does not fetch, display, or store Cambridge content. If you
          open the link, your browser sends the word in the page address directly to Cambridge’s
          website under its own privacy terms.
        </p>
        <h2>Device demo</h2>
        <p>
          Demo mode uses this browser’s local storage. It does not create an account or call live
          AI. Anyone using this browser profile can access the demo collection. Export before
          clearing browser data.
        </p>
        <h2>Cookies & offline storage</h2>
        <p>
          Real accounts use authentication cookies. Public app assets are cached to help with weak
          connections. Private pages, API responses, and personal data are not saved in
          service-worker caches. No third-party analytics are enabled.
        </p>
        <h2>Your choices</h2>
        <p>
          Export your wordbook from Settings. Edit notes, archive words, and reset schedules from
          your collection. You can remove captures and practice journal entries, or discard
          unfinished sessions. Export includes these private records. Learning-tip preferences and
          dismissals are stored in this browser. Allowlisted app operators can view basic account
          status and permanently delete an account through the private management page or Supabase;
          this cascades to all personal learning records. Shared lexical definitions remain. A
          confirmed signup creates a private delivery event so the operator can receive one account
          notification by email.
        </p>
      </section>
    </main>
  );
}
