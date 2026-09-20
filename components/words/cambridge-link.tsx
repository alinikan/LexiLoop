export function CambridgeLink({ word }: { word: string }) {
  const href = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`;
  return (
    <a className="cambridge-link-card" href={href} target="_blank" rel="noopener noreferrer">
      <span>
        <strong>Open in Cambridge Dictionary</strong>
        <small>View “{word}” on Cambridge’s website</small>
      </span>
      <b aria-hidden="true">↗</b>
    </a>
  );
}
