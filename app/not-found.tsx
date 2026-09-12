import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="standalone-page">
      <h1>This page is out of the loop.</h1>
      <p>Let’s get you back to your words.</p>
      <Link className="button" href="/">
        Back to today
      </Link>
    </main>
  );
}
